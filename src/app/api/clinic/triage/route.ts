import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import { runTriage } from '@/lib/ai/triage'
import type { Json, TriageCategory } from '@/types/database'

const VALID_CATEGORIES: TriageCategory[] = ['emergency', 'urgent_same_day', 'routine', 'follow_up']

/**
 * GET  /api/clinic/triage    list triage sessions (queue) for the clinic
 * POST /api/clinic/triage    counter-desk / voice-follow-up staff entry
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const category = req.nextUrl.searchParams.get('category')
  const db = getDb()

  let q = db
    .from('triage_results')
    .select(`
      id, category, summary, doctor_notes, is_ai_edited, reviewed_by, reviewed_at, created_at,
      suggested_doctor_id, doctors:suggested_doctor_id ( full_name ),
      symptom_triage_sessions!inner ( id, clinic_id, source, age_group, status, patient_id, patients ( full_name, phone ) )
    `)
    .eq('symptom_triage_sessions.clinic_id', session.clinicId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (category && VALID_CATEGORIES.includes(category as TriageCategory)) {
    q = q.eq('category', category as TriageCategory)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['clinic_admin', 'doctor', 'receptionist'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    patient_id?: string | null
    appointment_id?: string | null
    source: 'counter' | 'voice_followup'
    chief_complaint: string
    duration?: string
    fever: boolean
    fever_c?: number | null
    pain_severity?: number
    age_group?: string
    existing_conditions?: string[]
    current_medicines?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.chief_complaint?.trim()) {
    return NextResponse.json({ error: 'chief_complaint is required' }, { status: 400 })
  }

  const db = getDb()
  const { data: doctors } = await db
    .from('doctors')
    .select('specialization')
    .eq('clinic_id', session.clinicId)
    .eq('is_active', true)
  const specialties = Array.from(new Set((doctors || []).map(d => d.specialization).filter(Boolean))) as string[]

  const result = await runTriage({
    chiefComplaint: body.chief_complaint.trim(),
    duration: body.duration,
    fever: !!body.fever,
    feverC: body.fever_c ?? null,
    painSeverity: body.pain_severity,
    ageGroup: body.age_group,
    existingConditions: body.existing_conditions || [],
    currentMedicines: body.current_medicines || [],
    clinicSpecialties: specialties,
  })

  const { data: triageSession, error: sessionError } = await db
    .from('symptom_triage_sessions')
    .insert({
      clinic_id: session.clinicId,
      patient_id: body.patient_id || null,
      appointment_id: body.appointment_id || null,
      source: body.source,
      age_group: (body.age_group as 'infant' | 'child' | 'adult' | 'senior' | undefined) || null,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (sessionError || !triageSession) {
    return NextResponse.json({ error: sessionError?.message || 'Failed to save triage session' }, { status: 500 })
  }

  await db.from('triage_answers').insert({
    session_id: triageSession.id,
    chief_complaint: body.chief_complaint.trim(),
    duration: body.duration || null,
    fever: !!body.fever,
    pain_severity: body.pain_severity ?? null,
    existing_conditions: body.existing_conditions || [],
    current_medicines: body.current_medicines || [],
    red_flags: result.redFlags,
    raw_answers: body as unknown as Json,
  })

  const { data: triageResult, error: resultError } = await db
    .from('triage_results')
    .insert({
      session_id: triageSession.id,
      category: result.category,
      summary: result.summary,
      doctor_notes: result.doctorNotes,
      ai_model: result.aiModel,
    })
    .select()
    .single()

  if (resultError) return NextResponse.json({ error: resultError.message }, { status: 500 })

  return NextResponse.json({ sessionId: triageSession.id, ...triageResult }, { status: 201 })
}
