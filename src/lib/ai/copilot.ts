import { chatCompletion, parseJsonResponse } from './openrouter'
import { detectRedFlags, buildCopilotQuestionsPrompt, buildCopilotSuggestionsPrompt } from './guardrails'

export interface CopilotQaTurn {
  question: string
  answer: string
}

export interface CopilotQuestionSuggestion {
  question: string
  priority: 'red_flag' | 'routine'
}

/**
 * Suggests 2-5 follow-up questions for the doctor to ask next. Red flags in
 * what's been said so far are still detected deterministically and forced
 * to the top as 'red_flag' priority — same never-rely-solely-on-the-LLM
 * principle as patient-intake triage (see triage.ts), even though this
 * flow's output is advisory to a doctor rather than patient-facing.
 */
export async function suggestFollowUpQuestions(args: {
  presentingComplaint: string
  qaSoFar: CopilotQaTurn[]
}): Promise<CopilotQuestionSuggestion[]> {
  const redFlags = detectRedFlags({
    text: [args.presentingComplaint, ...args.qaSoFar.map(qa => `${qa.question} ${qa.answer}`)].join(' '),
  })

  const forced: CopilotQuestionSuggestion[] = redFlags.map(flag => ({
    question: `Urgent-review flag: possible ${flag.replace(/_/g, ' ')} — assess and act on this before continuing.`,
    priority: 'red_flag',
  }))

  try {
    const { system, user } = buildCopilotQuestionsPrompt({
      presentingComplaint: args.presentingComplaint,
      qaSoFar: args.qaSoFar,
    })
    const result = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.3, maxTokens: 400, withFallback: true },
    )
    const parsed = parseJsonResponse<{ questions: Array<{ question: string; priority: string }> }>(result.content)
    const suggested: CopilotQuestionSuggestion[] = (parsed.questions || [])
      .filter(q => q.question)
      .map(q => ({ question: String(q.question), priority: q.priority === 'red_flag' ? 'red_flag' : 'routine' }))
    return [...forced, ...suggested]
  } catch (err) {
    console.warn('[copilot] question suggestion failed:', err)
    return forced
  }
}

export interface FormularyEntry {
  id: string
  drugName: string
  drugClass: string | null
  dosageRange: string
  sourceReference: string
}

export interface CopilotSuggestions {
  diagnoses: Array<{ condition: string; confidenceNote: string; status: 'pending' }>
  tests: Array<{ testName: string; reason: string; status: 'pending' }>
  medications: Array<{
    formularyId: string
    drug: string
    dosageRange: string
    sourceReference: string
    note: string
    status: 'pending'
  }>
  aiModel: string | null
}

/**
 * Generates the end-of-consultation suggestion panel: differential
 * considerations, tests, and medications. Medications are constrained to
 * the supplied formulary — the LLM is only ever asked to pick a
 * `formularyId` from the list handed to it, and any id it returns that
 * isn't in that list is dropped rather than trusted, so a hallucinated
 * drug can never reach the doctor's screen.
 */
export async function generateCopilotSuggestions(args: {
  presentingComplaint: string
  qaSoFar: CopilotQaTurn[]
  formulary: FormularyEntry[]
}): Promise<CopilotSuggestions> {
  const formularyById = new Map(args.formulary.map(f => [f.id, f]))

  try {
    const { system, user } = buildCopilotSuggestionsPrompt({
      presentingComplaint: args.presentingComplaint,
      qaSoFar: args.qaSoFar,
      formulary: args.formulary,
    })
    const result = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.2, maxTokens: 800, withFallback: true },
    )
    const parsed = parseJsonResponse<{
      diagnoses: Array<{ condition: string; confidenceNote: string }>
      tests: Array<{ testName: string; reason: string }>
      medications: Array<{ formularyId: string; note: string }>
    }>(result.content)

    const medications = (parsed.medications || [])
      .map(m => {
        const entry = formularyById.get(m.formularyId)
        if (!entry) return null
        return {
          formularyId: entry.id,
          drug: entry.drugName,
          dosageRange: entry.dosageRange,
          sourceReference: entry.sourceReference,
          note: String(m.note || ''),
          status: 'pending' as const,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)

    return {
      diagnoses: (parsed.diagnoses || [])
        .filter(d => d.condition)
        .map(d => ({ condition: String(d.condition), confidenceNote: String(d.confidenceNote || ''), status: 'pending' as const })),
      tests: (parsed.tests || [])
        .filter(t => t.testName)
        .map(t => ({ testName: String(t.testName), reason: String(t.reason || ''), status: 'pending' as const })),
      medications,
      aiModel: result.model,
    }
  } catch (err) {
    console.warn('[copilot] suggestion generation failed:', err)
    return { diagnoses: [], tests: [], medications: [], aiModel: null }
  }
}
