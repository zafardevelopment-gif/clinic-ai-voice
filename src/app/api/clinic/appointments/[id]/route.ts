import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getDb()
  const { data, error } = await db
    .from('appointments')
    .update(body)
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId!)
    .select('id, appointment_date, appointment_time, status, reason, booked_via, patients(full_name), doctors(full_name, specialization)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
