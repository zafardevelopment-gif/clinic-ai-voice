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
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const body = await req.json()
  const db = getDb()
  const { data, error } = await db
    .from('patients')
    .insert({
      full_name: body.full_name,
      phone: body.phone || null,
      email: body.email || null,
      date_of_birth: body.date_of_birth || null,
      gender: body.gender || null,
      address: body.address || null,
      notes: body.notes || null,
      clinic_id: clinicId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
