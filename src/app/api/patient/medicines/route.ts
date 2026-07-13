import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'
import { generateDoseSchedule } from '@/lib/patient/dose-schedule'

/**
 * GET  /api/patient/medicines   list own active medicines
 * POST /api/patient/medicines   add a medicine (manual entry, Phase 1) + generate its dose schedule
 */
export async function GET(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('patient_medicines')
    .select('*')
    .eq('patient_id', session.patientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    medicine_name?: string
    dosage?: string | null
    frequency?: string
    duration_days?: number | null
    times_of_day?: string[]
    started_at?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.medicine_name?.trim()) return NextResponse.json({ error: 'medicine_name is required' }, { status: 400 })
  if (!body.frequency?.trim()) return NextResponse.json({ error: 'frequency is required' }, { status: 400 })
  const timesOfDay = Array.isArray(body.times_of_day) ? body.times_of_day : []
  for (const t of timesOfDay) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) {
      return NextResponse.json({ error: `Invalid time "${t}" — expected HH:MM` }, { status: 400 })
    }
  }

  const startedAt = body.started_at || new Date().toISOString().slice(0, 10)
  const db = getDb()

  const { data: medicine, error } = await db
    .from('patient_medicines')
    .insert({
      patient_id: session.patientId,
      medicine_name: body.medicine_name.trim(),
      dosage: body.dosage || null,
      frequency: body.frequency.trim(),
      duration_days: body.duration_days ?? null,
      times_of_day: timesOfDay,
      source: 'manual',
      started_at: startedAt,
    })
    .select()
    .single()

  if (error || !medicine) return NextResponse.json({ error: error?.message || 'Failed to save medicine' }, { status: 500 })

  const doses = generateDoseSchedule({
    patientMedicineId: medicine.id,
    patientId: session.patientId,
    timesOfDay,
    durationDays: body.duration_days ?? null,
    startedAt,
  })

  if (doses.length > 0) {
    const { error: doseErr } = await db.from('patient_medicine_doses').insert(doses)
    if (doseErr) return NextResponse.json({ error: doseErr.message }, { status: 500 })
  }

  return NextResponse.json(medicine, { status: 201 })
}
