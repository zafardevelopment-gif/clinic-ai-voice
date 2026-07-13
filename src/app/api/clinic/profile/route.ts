import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'

/**
 * GET  /api/clinic/profile   clinic's own business/billing details
 * PUT  /api/clinic/profile   update business/billing details (used for GST invoicing)
 */
export async function GET() {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('clinics')
    .select('id, name, phone, email, address, city, country, state, pincode, gstin, invoice_prefix, logo_url')
    .eq('id', session.clinicId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['clinic_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    name?: string
    phone?: string | null
    email?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    gstin?: string | null
    invoice_prefix?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (body.gstin) {
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
    if (!gstinPattern.test(body.gstin.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid GSTIN format' }, { status: 400 })
    }
  }

  const db = getDb()
  const { data, error } = await db
    .from('clinics')
    .update({
      ...(body.name !== undefined ? { name: body.name } : {}),
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      pincode: body.pincode ?? null,
      gstin: body.gstin ? body.gstin.toUpperCase() : null,
      ...(body.invoice_prefix ? { invoice_prefix: body.invoice_prefix } : {}),
    })
    .eq('id', session.clinicId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
