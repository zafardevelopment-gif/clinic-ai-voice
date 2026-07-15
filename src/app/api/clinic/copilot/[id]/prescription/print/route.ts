import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { renderPrescriptionHtml } from '@/lib/copilot/prescription-html'

/** GET /api/clinic/copilot/:id/prescription/print — self-contained HTML prescription, "Save as PDF" via browser print. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()

  const { data: triageSession, error: sessionError } = await db
    .from('symptom_triage_sessions')
    .select('id, clinic_id, patients ( full_name, phone )')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .eq('mode', 'doctor_copilot')
    .single()
  if (sessionError || !triageSession) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const [{ data: answers }, { data: result }, { data: clinic }] = await Promise.all([
    db.from('triage_answers').select('chief_complaint').eq('session_id', params.id).maybeSingle(),
    db.from('triage_results').select('doctor_final_diagnosis, doctor_final_prescription, finalized_at, finalized_by').eq('session_id', params.id).maybeSingle(),
    db.from('clinics').select('name, address, city, phone, email').eq('id', session.clinicId).single(),
  ])

  if (!result || !result.finalized_at) {
    return NextResponse.json({ error: 'Consultation is not finalized yet' }, { status: 400 })
  }

  let doctor: { full_name: string; specialization: string | null; qualifications: string | null } | null = null
  if (result.finalized_by) {
    const { data: finalizingUser } = await db
      .from('users')
      .select('doctor_id')
      .eq('id', result.finalized_by)
      .maybeSingle()
    if (finalizingUser?.doctor_id) {
      const { data: doc } = await db
        .from('doctors')
        .select('full_name, specialization, qualifications')
        .eq('id', finalizingUser.doctor_id)
        .maybeSingle()
      doctor = doc || null
    }
  }

  const html = renderPrescriptionHtml({
    clinic: clinic || { name: 'Clinic', address: null, city: null, phone: null, email: null },
    doctor,
    patient: (triageSession as unknown as { patients: { full_name: string; phone: string | null } | null }).patients,
    presenting_complaint: answers?.chief_complaint || '',
    final_diagnosis: result.doctor_final_diagnosis || '',
    prescription: (result.doctor_final_prescription || []).map(p => ({
      drug: p.drug,
      dosage: p.dosage,
      frequency: p.frequency,
      duration_days: p.duration_days,
    })),
    finalized_at: result.finalized_at,
  })

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
