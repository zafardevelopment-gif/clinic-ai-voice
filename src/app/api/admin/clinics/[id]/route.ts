import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  const db = getDb()
  const { data, error } = await db
    .from('clinics')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await req.json()

    const name = (body.name ?? '').trim()
    if (!name) {
      return NextResponse.json({ error: 'Clinic name is required' }, { status: 400 })
    }

    const payload = {
      name,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      country: body.country || null,
      is_active: body.is_active ?? true,
    }

    const db = getDb()
    const { data, error } = await db
      .from('clinics')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single()

    if (error || !data) {
      console.error('Failed to update clinic:', error)
      return NextResponse.json(
        { error: error?.message || 'Failed to update clinic' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, clinic_id: data.id })
  } catch (err) {
    console.error('/api/admin/clinics/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
