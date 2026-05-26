import { chatCompletion, parseJsonResponse, type LlmMessage } from './openrouter'

/**
 * Stable intent labels the rest of the app branches on. Keep this list
 * narrow — new intents need handler logic in process-intent / book-appointment
 * routes before they're worth classifying.
 */
export const INTENT_LABELS = [
  'book_appointment',
  'cancel_reschedule',
  'doctor_availability',
  'clinic_hours',
  'followup_inquiry',
  'general_query',
  'emergency',
] as const

export type Intent = (typeof INTENT_LABELS)[number]

export type CallType = 'booking' | 'query' | 'followup'

export interface IntentResult {
  intent: Intent
  callType: CallType
  confidence: number
  /** Brief reasoning so we can debug misclassifications from call_events. */
  reasoning: string
  /** Slots the model extracted from the utterance. May be partial. */
  slots: {
    doctorName?: string
    departmentName?: string
    preferredDate?: string
    preferredTime?: string
    patientName?: string
    patientPhone?: string
    reason?: string
  }
}

const INTENT_TO_CALL_TYPE: Record<Intent, CallType> = {
  book_appointment: 'booking',
  cancel_reschedule: 'booking',
  doctor_availability: 'query',
  clinic_hours: 'query',
  followup_inquiry: 'followup',
  general_query: 'query',
  emergency: 'query',
}

const SYSTEM_PROMPT = `You are an intent classifier for an Indian clinic's voice agent.
The caller speaks in English, Hindi, or Hinglish (mixed). Stay neutral to language —
your output is always JSON in English.

Available intents:
- book_appointment: caller wants to schedule a new appointment
- cancel_reschedule: caller wants to cancel or move an existing appointment
- doctor_availability: caller is asking about a doctor's schedule, not booking yet
- clinic_hours: caller asks about open/close hours, location, contact
- followup_inquiry: caller asking about reports, lab results, prescription follow-up
- emergency: caller has urgent symptoms / medical emergency — needs immediate human transfer
- general_query: anything else

Extract any slots the caller mentioned (doctor name, department, date phrases like
"kal", "tomorrow", "Monday morning", patient name, phone number, reason for visit).
Leave slot fields out if not mentioned — do not invent values.

Respond ONLY with a JSON object, no prose, matching:
{
  "intent": "<one of the labels above>",
  "confidence": <0.0-1.0>,
  "reasoning": "<one short sentence>",
  "slots": { ... }
}`

/**
 * Classify caller intent from a single transcript turn.
 *
 * Use this on the FIRST user utterance per call to route the conversation.
 * For mid-call updates, prefer slot-extraction prompts that assume an already-
 * established intent.
 */
export async function classifyIntent(transcript: string): Promise<IntentResult> {
  const messages: LlmMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Caller said: "${transcript}"` },
  ]

  const result = await chatCompletion(messages, {
    temperature: 0.1, // Low — we want deterministic classification
    maxTokens: 250,
    withFallback: true,
  })

  let parsed: Omit<IntentResult, 'callType'>
  try {
    parsed = parseJsonResponse<Omit<IntentResult, 'callType'>>(result.content)
  } catch (err) {
    console.error('[intent-classifier] failed to parse LLM response:', result.content, err)
    // Fall back to a safe default rather than blowing up the call.
    return {
      intent: 'general_query',
      callType: 'query',
      confidence: 0,
      reasoning: 'classifier_parse_error',
      slots: {},
    }
  }

  const intent = (INTENT_LABELS as readonly string[]).includes(parsed.intent)
    ? (parsed.intent as Intent)
    : 'general_query'

  return {
    intent,
    callType: INTENT_TO_CALL_TYPE[intent],
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    reasoning: parsed.reasoning || '',
    slots: parsed.slots || {},
  }
}
