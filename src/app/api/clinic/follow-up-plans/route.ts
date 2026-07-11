import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import type { FollowUpPlanStatus, Json, Medicine } from '@/types/database'

/**
 * GET  /api/clinic/follow-up-plans        list plans for the clinic
 * POST /api/clinic/follow-up-plans        create a plan (clinic_admin / doctor)
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || 'all'
  const db = getDb()
  let q = db
    .from('follow_up_plans')
    .select('id, patient_id, appointment_id, medicines, reminder_frequency, follow_up_date, care_instructions, escalation_contact, status, created_at, patients ( full_name, phone )')
    .eq('clinic_id', session.clinicId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (status !== 'all') q = q.eq('status', status as FollowUpPlanStatus)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['clinic_admin', 'doctor'])) {
    return NextResponse.json({ error: 'Forbidden — only doctors/clinic admins can create follow-up plans' }, { status: 403 })
  }

  let body: {
    patient_id: string
    appointment_id?: string | null
    medicines: Medicine[]
    reminder_frequency?: 'daily' | 'twice_daily' | 'weekly'
    follow_up_date?: string | null
    care_instructions?: string | null
    escalation_contact?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  const db = getDb()
  const { data, error } = await db
    .from('follow_up_plans')
    .insert({
      clinic_id: session.clinicId,
      patient_id: body.patient_id,
      appointment_id: body.appointment_id || null,
      created_by: session.userId,
      medicines: (body.medicines || []) as unknown as Json,
      reminder_frequency: body.reminder_frequency || 'daily',
      follow_up_date: body.follow_up_date || null,
      care_instructions: body.care_instructions || null,
      escalation_contact: body.escalation_contact || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
