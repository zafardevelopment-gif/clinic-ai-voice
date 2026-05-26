import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

type OnboardingMode = 'forwarding' | 'llp_dedicated' | 'own_kyc'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()

    const name = (body.name || '').trim()
    if (!name) {
      return NextResponse.json({ error: 'Clinic name is required' }, { status: 400 })
    }

    const mode: OnboardingMode = body.onboarding_mode || 'forwarding'

    if (mode === 'forwarding' && !body.forwarded_from_number) {
      return NextResponse.json(
        { error: 'forwarded_from_number is required for forwarding mode' },
        { status: 400 },
      )
    }
    if ((mode === 'llp_dedicated' || mode === 'own_kyc') && !body.twilio_number) {
      return NextResponse.json(
        { error: 'twilio_number is required for this mode' },
        { status: 400 },
      )
    }

    const db = getDb()

    const payload = {
      name,
      phone: body.phone || body.twilio_number || null,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      country: body.country || null,
      onboarding_mode: mode,
      forwarded_from_number: body.forwarded_from_number || null,
      twilio_number: body.twilio_number || null,
      twilio_number_owner: body.twilio_number_owner || null,
    }

    const { data, error } = await db
      .from('clinics')
      .insert(payload)
      .select('id')
      .single()

    if (error || !data) {
      console.error('Failed to create clinic:', error)
      return NextResponse.json(
        { error: error?.message || 'Failed to create clinic' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, clinic_id: data.id }, { status: 201 })
  } catch (err) {
    console.error('/api/admin/clinics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
