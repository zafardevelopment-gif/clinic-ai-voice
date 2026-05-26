/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const db = getDb()
  const { data } = await db.from('voice_agent_config').select('*').eq('clinic_id', clinicId).single()
  return NextResponse.json(data || null)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const body = await req.json()
  // `ai_knowledge` was added to the table post-types-gen, so the Database
  // types don't include it yet. Cast to any to bypass until types are
  // regenerated via Supabase CLI.
  const db = getDb() as any

  const { data: existing } = await db.from('voice_agent_config').select('id').eq('clinic_id', clinicId).single()

  const fields = {
    is_enabled: body.is_enabled,
    voice_type: body.voice_type,
    language: body.language,
    greeting_message: body.greeting_message,
    working_hours_start: body.working_hours_start,
    working_hours_end: body.working_hours_end,
    working_days: body.working_days,
    max_call_duration_seconds: body.max_call_duration_seconds,
    fallback_phone: body.fallback_phone || null,
    booking_rules: body.booking_rules,
    ai_knowledge: body.ai_knowledge || null,
  }

  let result
  if (existing) {
    const { data, error } = await db.from('voice_agent_config').update(fields).eq('clinic_id', clinicId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    const { data, error } = await db.from('voice_agent_config').insert({ ...fields, clinic_id: clinicId }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }
  return NextResponse.json(result)
}
