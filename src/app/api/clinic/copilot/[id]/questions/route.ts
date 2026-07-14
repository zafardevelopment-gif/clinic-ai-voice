import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import { suggestFollowUpQuestions } from '@/lib/ai/copilot'
import type { CopilotSuggestedQuestion } from '@/types/database'

/** POST /api/clinic/copilot/[id]/questions — (re)generate AI follow-up question suggestions. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['doctor'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    .select('chief_complaint, qa_log')
    .eq('session_id', params.id)
    .maybeSingle()
  if (!answers) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const questions = await suggestFollowUpQuestions({
    presentingComplaint: answers.chief_complaint,
    qaSoFar: answers.qa_log.map(qa => ({ question: qa.question, answer: qa.answer })),
  })

  const asStored: CopilotSuggestedQuestion[] = questions

  await db
    .from('triage_results')
    .update({ ai_suggested_questions: asStored })
    .eq('session_id', params.id)

  return NextResponse.json({ questions })
}
