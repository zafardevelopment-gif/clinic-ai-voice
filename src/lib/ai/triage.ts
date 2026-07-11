import { chatCompletion } from '@/lib/ai/openrouter'
import { detectRedFlags, buildTriagePrompt, SAFETY_DISCLAIMER_EN } from './guardrails'

export interface TriageInput {
  chiefComplaint: string
  duration?: string
  fever: boolean
  feverC?: number | null
  painSeverity?: number
  ageGroup?: string
  existingConditions: string[]
  currentMedicines: string[]
  clinicSpecialties?: string[]
}

export interface TriageOutput {
  category: 'emergency' | 'urgent_same_day' | 'routine' | 'follow_up'
  summary: string
  doctorNotes: string
  suggestedSpecialty: string | null
  redFlags: string[]
  aiModel: string | null
}

/**
 * Runs symptom triage. Red-flag detection is ALWAYS checked first and is
 * purely deterministic (see guardrails.ts) — if any red flag fires, we
 * short-circuit straight to 'emergency' without calling the LLM at all.
 * This guarantees emergency detection can't be skipped by an LLM outage,
 * timeout, or hallucinated reassurance.
 */
export async function runTriage(input: TriageInput): Promise<TriageOutput> {
  const redFlags = detectRedFlags({
    text: [input.chiefComplaint, ...input.existingConditions, ...input.currentMedicines].join(' '),
    feverC: input.feverC,
    ageGroup: input.ageGroup,
  })

  if (redFlags.length > 0) {
    return {
      category: 'emergency',
      summary: `This looks like it may be a medical emergency (possible signs: ${redFlags.join(', ').replace(/_/g, ' ')}). ${SAFETY_DISCLAIMER_EN} Please seek immediate in-person or emergency care.`,
      doctorNotes: `Automated red-flag match: ${redFlags.join(', ')}. Chief complaint: "${input.chiefComplaint}". Recommend immediate clinical assessment — do not treat this summary as reassurance.`,
      suggestedSpecialty: null,
      redFlags,
      aiModel: null,
    }
  }

  try {
    const { system, user } = buildTriagePrompt({
      chiefComplaint: input.chiefComplaint,
      duration: input.duration,
      fever: input.fever,
      painSeverity: input.painSeverity,
      ageGroup: input.ageGroup,
      existingConditions: input.existingConditions,
      currentMedicines: input.currentMedicines,
      clinicSpecialties: input.clinicSpecialties,
    })

    const result = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.2, maxTokens: 500, withFallback: true },
    )

    const parsed = parseTriageJson(result.content)

    return {
      category: parsed.category,
      summary: `${parsed.summary} ${SAFETY_DISCLAIMER_EN}`,
      doctorNotes: parsed.doctorNotes,
      suggestedSpecialty: parsed.suggestedSpecialty,
      redFlags: [],
      aiModel: result.model,
    }
  } catch (err) {
    console.warn('[triage] LLM failed, falling back to routine + doctor review:', err)
    return {
      category: 'routine',
      summary: `We could not automatically summarize these symptoms. A staff member will review before your visit. ${SAFETY_DISCLAIMER_EN}`,
      doctorNotes: `AI summarization unavailable. Chief complaint: "${input.chiefComplaint}". Manual review needed.`,
      suggestedSpecialty: null,
      redFlags: [],
      aiModel: null,
    }
  }
}

function parseTriageJson(content: string): { category: 'urgent_same_day' | 'routine' | 'follow_up'; summary: string; doctorNotes: string; suggestedSpecialty: string | null } {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  const category = ['urgent_same_day', 'routine', 'follow_up'].includes(parsed.category) ? parsed.category : 'routine'
  return {
    category,
    summary: String(parsed.summary || 'Summary unavailable — doctor review recommended.'),
    doctorNotes: String(parsed.doctorNotes || ''),
    suggestedSpecialty: parsed.suggestedSpecialty || null,
  }
}
