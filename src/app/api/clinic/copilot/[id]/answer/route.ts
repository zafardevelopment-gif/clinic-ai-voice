import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import type { CopilotQaLogEntry } from '@/types/database'

/**
 * POST /api/clinic/copilot/[id]/answer  { question, answer, source? }
 * Appends one Q&A turn to the session's running log (either an AI-suggested
 * question the doctor asked, or a question the doctor added themselves).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['doctor'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { question?: string; answer?: string; source?: 'ai_suggested' | 'doctor_added' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.question?.trim() || !body.answer?.trim()) {
    return NextResponse.json({ error: 'question and answer are required' }, { status: 400 })
  }

  const db = getDb()

  const { data: triageSession } = await db
    .from('symptom_triage_sessions')
    .select('id')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .eq('mode', 'doctor_copilot')
    .maybeSingle()
  if (!triageSession) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: answers } = await db
    .from('triage_answers')
    .select('qa_log')
    .eq('session_id', params.id)
    .maybeSingle()
  if (!answers) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const entry: CopilotQaLogEntry = {
    question: body.question.trim(),
    answer: body.answer.trim(),
    source: body.source === 'doctor_added' ? 'doctor_added' : 'ai_suggested',
    answered_at: new Date().toISOString(),
  }

  const qaLog = [...answers.qa_log, entry]

  const { error } = await db
    .from('triage_answers')
    .update({ qa_log: qaLog })
    .eq('session_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ qaLog })
}
