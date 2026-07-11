import { chatCompletion } from '@/lib/ai/openrouter'
import { buildLabExplanationPrompt, SAFETY_DISCLAIMER_EN, SAFETY_DISCLAIMER_HI } from './guardrails'

export interface LabMarkerInput {
  name: string
  value: string
  unit?: string
  referenceRange?: string
  flag: 'low' | 'high' | 'normal' | 'critical'
}

export interface LabExplanationOutput {
  patientSummaryEn: string
  patientSummaryHi: string
  abnormalMarkersSummary: string
  doctorDiscussionPoints: string
  nextActionCategory: 'routine_review' | 'discuss_soon' | 'urgent_review'
  aiModel: string | null
}

/**
 * Explains a set of lab markers in plain language. Like triage, urgency
 * category has a deterministic override: any marker flagged 'critical' by
 * the caller (a fixed reference-range comparison, not the LLM) forces
 * nextActionCategory to 'urgent_review' regardless of what the model says —
 * never rely solely on the LLM to catch a dangerous result.
 */
export async function explainLabReport(markers: LabMarkerInput[]): Promise<LabExplanationOutput> {
  const hasCritical = markers.some(m => m.flag === 'critical')

  try {
    const { system, user } = buildLabExplanationPrompt({ markers })
    const result = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.2, maxTokens: 700, withFallback: true },
    )

    const parsed = parseExplanationJson(result.content)

    return {
      patientSummaryEn: `${parsed.patientSummaryEn} ${SAFETY_DISCLAIMER_EN}`,
      patientSummaryHi: `${parsed.patientSummaryHi} ${SAFETY_DISCLAIMER_HI}`,
      abnormalMarkersSummary: parsed.abnormalMarkersSummary,
      doctorDiscussionPoints: parsed.doctorDiscussionPoints,
      nextActionCategory: hasCritical ? 'urgent_review' : parsed.nextActionCategory,
      aiModel: result.model,
    }
  } catch (err) {
    console.warn('[lab-explanation] LLM failed, falling back to manual-review placeholder:', err)
    const abnormal = markers.filter(m => m.flag !== 'normal').map(m => `${m.name}: ${m.value}${m.unit ? ' ' + m.unit : ''} (${m.flag})`).join(', ')
    return {
      patientSummaryEn: `We could not automatically summarize this report. ${SAFETY_DISCLAIMER_EN}`,
      patientSummaryHi: `Hum is report ko automatic summarize nahi kar paaye. ${SAFETY_DISCLAIMER_HI}`,
      abnormalMarkersSummary: abnormal || 'No abnormal markers auto-detected.',
      doctorDiscussionPoints: 'AI summarization unavailable. Manual review needed.',
      nextActionCategory: hasCritical ? 'urgent_review' : 'discuss_soon',
      aiModel: null,
    }
  }
}

function parseExplanationJson(content: string): {
  patientSummaryEn: string
  patientSummaryHi: string
  abnormalMarkersSummary: string
  doctorDiscussionPoints: string
  nextActionCategory: 'routine_review' | 'discuss_soon' | 'urgent_review'
} {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  const nextActionCategory = ['routine_review', 'discuss_soon', 'urgent_review'].includes(parsed.nextActionCategory)
    ? parsed.nextActionCategory
    : 'discuss_soon'
  return {
    patientSummaryEn: String(parsed.patientSummaryEn || 'Summary unavailable.'),
    patientSummaryHi: String(parsed.patientSummaryHi || 'Summary uplabdh nahi hai.'),
    abnormalMarkersSummary: String(parsed.abnormalMarkersSummary || ''),
    doctorDiscussionPoints: String(parsed.doctorDiscussionPoints || ''),
    nextActionCategory,
  }
}

/** Deterministic flag from value vs reference range, where parseable (e.g. "70-110"). */
export function deriveFlag(value: string, referenceRange?: string): 'low' | 'high' | 'normal' | 'critical' {
  if (!referenceRange) return 'normal'
  const numValue = parseFloat(value)
  const match = referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/)
  if (Number.isNaN(numValue) || !match) return 'normal'

  const [, lowStr, highStr] = match
  const low = parseFloat(lowStr)
  const high = parseFloat(highStr)
  if (Number.isNaN(low) || Number.isNaN(high)) return 'normal'

  if (numValue < low * 0.5 || numValue > high * 2) return 'critical'
  if (numValue < low) return 'low'
  if (numValue > high) return 'high'
  return 'normal'
}
