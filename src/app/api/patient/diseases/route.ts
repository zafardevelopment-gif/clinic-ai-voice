import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/**
 * GET  /api/patient/diseases   list own active conditions
 * POST /api/patient/diseases   add a condition ("disease setup")
 */
export async function GET(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('patient_diseases')
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

  let body: { condition_name?: string; diagnosed_date?: string | null; notes?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.condition_name?.trim()) return NextResponse.json({ error: 'condition_name is required' }, { status: 400 })

  const db = getDb()
  const { data, error } = await db
    .from('patient_diseases')
    .insert({
      patient_id: session.patientId,
      condition_name: body.condition_name.trim(),
      diagnosed_date: body.diagnosed_date || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
