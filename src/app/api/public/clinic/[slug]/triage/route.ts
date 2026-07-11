import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { runTriage } from '@/lib/ai/triage'
import type { Json } from '@/types/database'

/**
 * POST /api/public/clinic/[slug]/triage
 *
 * Public, unauthenticated symptom intake for the clinic website (mirrors
 * api/public/clinic/[slug]/book/route.ts's gate pattern). Also reusable by
 * the counter-desk UI as a lower-friction entry point before login-gated
 * staff triage. Runs the same runTriage() pipeline — red flags are always
 * checked before any AI call.
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  let body: {
    chief_complaint: string
    duration?: string
    fever: boolean
    fever_c?: number | null
    pain_severity?: number
    age_group?: string
    existing_conditions?: string[]
    current_medicines?: string[]
    patient_phone?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.chief_complaint?.trim()) {
    return NextResponse.json({ error: 'chief_complaint is required' }, { status: 400 })
  }

  const db = getDb()
  const { data: clinic } = await db
    .from('clinics')
    .select('id')
    .eq('website_slug', params.slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

  const { data: doctors } = await db
    .from('doctors')
    .select('specialization')
    .eq('clinic_id', clinic.id)
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

  const { data: session, error: sessionError } = await db
    .from('symptom_triage_sessions')
    .insert({
      clinic_id: clinic.id,
      source: 'website',
      age_group: (body.age_group as 'infant' | 'child' | 'adult' | 'senior' | undefined) || null,
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message || 'Failed to save triage session' }, { status: 500 })
  }

  await db.from('triage_answers').insert({
    session_id: session.id,
    chief_complaint: body.chief_complaint.trim(),
    duration: body.duration || null,
    fever: !!body.fever,
    pain_severity: body.pain_severity ?? null,
    existing_conditions: body.existing_conditions || [],
    current_medicines: body.current_medicines || [],
    red_flags: result.redFlags,
    raw_answers: body as unknown as Json,
  })

  let suggestedDoctorId: string | null = null
  if (result.suggestedSpecialty) {
    const { data: match } = await db
      .from('doctors')
      .select('id')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .ilike('specialization', `%${result.suggestedSpecialty}%`)
      .maybeSingle()
    suggestedDoctorId = match?.id || null
  }

  await db.from('triage_results').insert({
    session_id: session.id,
    category: result.category,
    summary: result.summary,
    doctor_notes: result.doctorNotes,
    suggested_doctor_id: suggestedDoctorId,
    ai_model: result.aiModel,
  })

  return NextResponse.json({
    sessionId: session.id,
    category: result.category,
    summary: result.summary,
    isEmergency: result.category === 'emergency',
  }, { status: 201 })
}
