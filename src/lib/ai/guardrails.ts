/**
 * Shared safety guardrails for the clinical-support AI features (symptom
 * triage, lab report explanation, adherence check-in drafting).
 *
 * Product rule: these modules assist clinic operations and patient
 * communication — they never replace doctor judgment. Every AI-touched
 * output must:
 *   - never present a definitive diagnosis
 *   - never give unsupported drug dosing advice
 *   - use "guidance / summary / possible urgency / doctor review recommended"
 *     language, not diagnostic language
 *   - carry the safety disclaimer
 *   - be reviewable/editable by clinic staff before it reaches a patient
 *
 * Red-flag / emergency detection is DELIBERATELY deterministic (keyword
 * rules below), not LLM-dependent. An LLM call can fail, time out, or
 * hallucinate reassurance; a fixed keyword check cannot silently skip an
 * emergency. Call detectRedFlags() BEFORE any AI call and let it short-
 * circuit the flow when it fires.
 */

export const SAFETY_DISCLAIMER_EN =
  'This is guidance, not a diagnosis. Final medical advice must come from a doctor.'
export const SAFETY_DISCLAIMER_HI =
  'Yeh guidance hai, diagnosis nahi. Final medical advice ke liye doctor se milna zaroori hai.'

export const EMERGENCY_WARNING_EN =
  'This looks like it may be a medical emergency. Please seek immediate in-person or emergency care — do not wait for a scheduled appointment.'
export const EMERGENCY_WARNING_HI =
  'Yeh ek medical emergency ho sakti hai. Kripya turant nearest hospital/emergency mein jaayein — appointment ka intezaar na karein.'

/**
 * Keyword-based red-flag detection. Deliberately broad/over-inclusive:
 * false positives (routine complaint flagged as possible emergency) are
 * acceptable — a human reviews every triage result. False negatives
 * (missed emergency) are not acceptable.
 */
export const RED_FLAG_KEYWORDS: Record<string, string[]> = {
  chest_pain: ['chest pain', 'seene mein dard', 'chest tightness', 'seene me jalan'],
  breathing_difficulty: ['breathing difficulty', 'cant breathe', "can't breathe", 'saans lene mein takleef', 'shortness of breath', 'saans phool rahi'],
  unconsciousness: ['unconscious', 'unresponsive', 'behosh', 'not waking up', 'passed out'],
  seizure: ['seizure', 'fits', 'convulsion', 'daura', 'jhatke aa rahe'],
  heavy_bleeding: ['heavy bleeding', 'bleeding a lot', 'khoon bahut', 'excessive bleeding', 'bahut khoon beh raha'],
  stroke_signs: ['stroke', 'face drooping', 'slurred speech', 'one side weakness', 'ek taraf kamzori', 'muh tedha'],
  severe_allergic: ['anaphylaxis', 'throat swelling', 'severe allergic reaction', 'gala sooj raha'],
}

const VULNERABLE_AGE_GROUPS = new Set(['infant', 'senior'])
const HIGH_FEVER_THRESHOLD_C = 40 // >=40C / 104F is the "very high fever" bar

export interface RedFlagCheckInput {
  text: string
  feverC?: number | null
  ageGroup?: string | null
}

/**
 * Returns the list of red-flag keys detected (empty = none). Case/diacritic
 * insensitive substring match — intentionally simple and auditable rather
 * than an LLM classification.
 */
export function detectRedFlags(input: RedFlagCheckInput): string[] {
  const haystack = input.text.toLowerCase()
  const found: string[] = []

  for (const [flag, keywords] of Object.entries(RED_FLAG_KEYWORDS)) {
    if (keywords.some(k => haystack.includes(k.toLowerCase()))) {
      found.push(flag)
    }
  }

  if (
    input.feverC != null &&
    input.feverC >= HIGH_FEVER_THRESHOLD_C &&
    input.ageGroup &&
    VULNERABLE_AGE_GROUPS.has(input.ageGroup)
  ) {
    found.push('very_high_fever_vulnerable_patient')
  }

  return found
}

// ─── Prompt builders ──────────────────────────────────────────────────────
// Kept as pure functions in a dedicated file (not inline in routes) so
// guardrail wording is defined once and reused everywhere an LLM call
// touches patient-facing clinical content.

const GUARDRAIL_INSTRUCTIONS = `
Rules you must follow:
- Do NOT provide a definitive diagnosis. Use words like "possible", "may indicate", "guidance", "summary", "doctor review recommended".
- Do NOT give specific drug dosing or prescribing advice.
- Do NOT provide false reassurance. If uncertain or symptoms are concerning, say a doctor should review.
- Keep language simple, calm, and non-alarming, suitable for a patient with no medical background.
- Always write as an assistant helping a clinic communicate with a patient — never as the doctor.
- Output must be valid JSON only, matching the schema given. No markdown fences, no extra commentary.
`.trim()

export function buildTriagePrompt(args: {
  chiefComplaint: string
  duration?: string
  fever: boolean
  painSeverity?: number
  ageGroup?: string
  existingConditions: string[]
  currentMedicines: string[]
  clinicSpecialties?: string[]
}): { system: string; user: string } {
  const system = `You are a clinical intake assistant for a small Indian clinic. You help staff triage patients BEFORE they see a doctor. ${GUARDRAIL_INSTRUCTIONS}

Categorize into exactly one of: "urgent_same_day", "routine", "follow_up". (Never output "emergency" — that path is handled separately by deterministic red-flag rules, not by you.)

Respond with JSON: { "category": string, "summary": string (patient-safe, 2-3 sentences), "doctorNotes": string (clinical discussion points for staff/doctor, 2-4 bullet-style sentences), "suggestedSpecialty": string | null }`

  const user = `Chief complaint: ${args.chiefComplaint}
Duration: ${args.duration || 'not specified'}
Fever: ${args.fever ? 'yes' : 'no'}
Pain severity (0-10): ${args.painSeverity ?? 'not specified'}
Age group: ${args.ageGroup || 'not specified'}
Existing conditions: ${args.existingConditions.join(', ') || 'none reported'}
Current medicines: ${args.currentMedicines.join(', ') || 'none reported'}
Clinic specialties available: ${args.clinicSpecialties?.join(', ') || 'general practice'}`

  return { system, user }
}

export function buildLabExplanationPrompt(args: {
  markers: Array<{ name: string; value: string; unit?: string; referenceRange?: string; flag: string }>
}): { system: string; user: string } {
  const system = `You are a patient-education assistant for a small Indian clinic, explaining lab report results in simple language. ${GUARDRAIL_INSTRUCTIONS}

Determine nextActionCategory as exactly one of: "routine_review", "discuss_soon", "urgent_review".

Respond with JSON: { "patientSummaryEn": string (plain English, 3-5 sentences), "patientSummaryHi": string (same content in simple Hindi, Devanagari script), "abnormalMarkersSummary": string (list the abnormal markers and what they generally relate to, in plain language), "doctorDiscussionPoints": string (clinical talking points for the doctor, concise), "nextActionCategory": string }`

  const markerLines = args.markers
    .map(m => `- ${m.name}: ${m.value}${m.unit ? ' ' + m.unit : ''} (reference: ${m.referenceRange || 'n/a'}, flag: ${m.flag})`)
    .join('\n')

  const user = `Lab markers:\n${markerLines}`

  return { system, user }
}

// ─── Doctor Co-Pilot prompts (spec §7A) ─────────────────────────────────────
// Different guardrail posture from GUARDRAIL_INSTRUCTIONS above: this assists
// an already-licensed doctor, not a patient, so differential/test/medication
// suggestions ARE allowed — but only ever as advisory suggestions requiring
// explicit doctor Accept/Edit/Reject, never as a directive, and medications
// must be drawn only from the supplied formulary reference (never invented).

export const COPILOT_DISCLAIMER =
  'AI Suggestion — not a directive. Final clinical decision and legal responsibility rest with the treating physician.'

const COPILOT_GUARDRAIL_INSTRUCTIONS = `
Rules you must follow:
- You are assisting a LICENSED DOCTOR during a live consultation, not a patient. The doctor remains fully responsible for all decisions.
- Never phrase a suggestion as an instruction or a confirmed fact. Every item must read as a possibility requiring physician confirmation.
- Prioritize red-flag/emergency screening questions first when suggesting follow-up questions.
- For medications: choose ONLY from the formulary reference list provided. Never invent a drug, dosage, or brand not present in that list. If nothing in the list fits, say so explicitly instead of guessing.
- Output must be valid JSON only, matching the schema given. No markdown fences, no extra commentary.
`.trim()

export function buildCopilotQuestionsPrompt(args: {
  presentingComplaint: string
  qaSoFar: Array<{ question: string; answer: string }>
}): { system: string; user: string } {
  const system = `You are a clinical decision-support assistant helping a doctor during a live consultation. ${COPILOT_GUARDRAIL_INSTRUCTIONS}

Given the presenting complaint and the Q&A so far, suggest 2-5 relevant follow-up questions the doctor may want to ask next. Do not repeat a question already asked.

Respond with JSON: { "questions": [{ "question": string, "priority": "red_flag" | "routine" }] }`

  const qaText = args.qaSoFar.length
    ? args.qaSoFar.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')
    : '(none yet)'

  const user = `Presenting complaint: ${args.presentingComplaint}

Q&A so far:
${qaText}`

  return { system, user }
}

export function buildCopilotSuggestionsPrompt(args: {
  presentingComplaint: string
  qaSoFar: Array<{ question: string; answer: string }>
  formulary: Array<{ id: string; drugName: string; drugClass: string | null; dosageRange: string; sourceReference: string }>
}): { system: string; user: string } {
  const system = `You are a clinical decision-support assistant helping a doctor conclude a live consultation. ${COPILOT_GUARDRAIL_INSTRUCTIONS}

Generate:
(a) a ranked list of possible differential considerations (never state one as confirmed)
(b) suggested tests/investigations, each with a one-line reason
(c) suggested medications ONLY from the formulary list given below — reference each by its exact "id" from that list. If any red-flag/emergency symptom is present anywhere in the complaint or Q&A, surface it at the top of the differential list with an urgent-review flag regardless of what stage the consultation is at.

Respond with JSON: {
  "diagnoses": [{ "condition": string, "confidenceNote": string }],
  "tests": [{ "testName": string, "reason": string }],
  "medications": [{ "formularyId": string, "note": string }]
}`

  const qaText = args.qaSoFar.length
    ? args.qaSoFar.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')
    : '(none)'

  const formularyText = args.formulary
    .map(f => `- id: ${f.id} | ${f.drugName}${f.drugClass ? ` (${f.drugClass})` : ''} | ${f.dosageRange} | source: ${f.sourceReference}`)
    .join('\n')

  const user = `Presenting complaint: ${args.presentingComplaint}

Q&A:
${qaText}

Formulary reference (choose medications ONLY from this list, if any fit):
${formularyText || '(no formulary entries available — do not suggest any medication)'}`

  return { system, user }
}

export function buildAdherenceMessagePrompt(args: {
  patientName: string
  medicines: Array<{ name: string; dosage: string; frequency: string }>
  careInstructions?: string
  language: 'hi-IN' | 'en-IN'
}): { system: string; user: string } {
  const system = `You draft a short, warm medicine check-in message a clinic sends to a patient over WhatsApp/SMS. ${GUARDRAIL_INSTRUCTIONS}

Write in ${args.language === 'hi-IN' ? 'simple Hindi (Devanagari script), Hinglish tone acceptable' : 'simple Indian English'}. Keep it under 300 characters. End by asking the patient to reply TAKEN, MISSED, FEELING_BETTER, SIDE_EFFECTS, or CALL_ME.

Respond with JSON: { "message": string }`

  const user = `Patient: ${args.patientName}
Medicines: ${args.medicines.map(m => `${m.name} ${m.dosage} (${m.frequency})`).join('; ')}
Care instructions: ${args.careInstructions || 'none'}`

  return { system, user }
}
