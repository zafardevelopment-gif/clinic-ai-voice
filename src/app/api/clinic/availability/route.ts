import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const db = getDb()
  const { data, error } = await db
    .from('doctors')
    .select('*, departments(name), doctor_availability(*)')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { doctorId, availability } = await req.json()
  if (!doctorId || !Array.isArray(availability)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const db = getDb()
  const errors: string[] = []

  for (const avail of availability) {
    const { error } = await db
      .from('doctor_availability')
      .upsert({
        doctor_id: doctorId,
        day_of_week: avail.day_of_week,
        start_time: avail.start_time,
        end_time: avail.end_time,
        is_available: avail.is_available,
      }, { onConflict: 'doctor_id,day_of_week' })

    if (error) errors.push(error.message)
  }

  if (errors.length > 0) return NextResponse.json({ error: errors.join(', ') }, { status: 500 })
  return NextResponse.json({ ok: true })
}
