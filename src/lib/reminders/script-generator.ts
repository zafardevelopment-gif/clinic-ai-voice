import { chatCompletion, type LlmMessage } from '@/lib/ai/openrouter'

/**
 * Generates the spoken script for a single reminder call.
 *
 * Strategy: if the clinic has a custom template with placeholders, fill those
 * in deterministically (no LLM call — saves cost). Otherwise call the LLM
 * with a tight prompt to produce a 2-3 sentence Hindi/English script.
 *
 * Why two paths:
 *   - Templates are predictable and DLT-friendly. Most clinics will use these.
 *   - LLM path is for the few clinics who want personalization or who have
 *     unusual visit reasons that don't fit a template.
 */

export type ReminderType =
  | 'appointment_24h'
  | 'appointment_2h'
  | 'post_visit'
  | 'birthday'
  | 'annual_checkup'
  | 'broadcast'

export interface ScriptContext {
  type: ReminderType
  /** Spoken language code, e.g. 'hi-IN', 'en-IN'. */
  language: string
  patientName: string
  clinicName: string
  /** Required for appointment types. Pre-formatted in clinic timezone. */
  doctorName?: string
  appointmentDateText?: string  // e.g. "kal" / "tomorrow" / "Monday, 28 May"
  appointmentTimeText?: string  // e.g. "shaam 5 baje" / "5 PM"
  /** Required for broadcast. Free-form clinic-provided message. */
  customMessage?: string
  /** Optional per-clinic template with {placeholders}. */
  template?: string | null
}

/** Render a template with simple {placeholder} substitution. */
function renderTemplate(template: string, ctx: ScriptContext): string {
  return template
    .replace(/\{patient_name\}/g, ctx.patientName)
    .replace(/\{clinic_name\}/g, ctx.clinicName)
    .replace(/\{doctor_name\}/g, ctx.doctorName ?? '')
    .replace(/\{date\}/g, ctx.appointmentDateText ?? '')
    .replace(/\{time\}/g, ctx.appointmentTimeText ?? '')
    .trim()
}

/**
 * The DTMF instructions are appended automatically by the TwiML route so the
 * script generator only worries about the *content* of the message. This
 * keeps the audio consistent ("press 1 to confirm…" is always identical).
 */
const SYSTEM_PROMPT = `You write short voice-call scripts for an Indian clinic's reminder system.
Rules:
- Keep it 2-3 sentences, max 25 seconds when spoken.
- Match the requested language: hi-IN = Hindi (Devanagari OK), en-IN = English, hi-EN = Hinglish.
- Sound warm but professional. No emojis. No URLs. No marketing.
- Do NOT include "press 1 to confirm" type instructions — those are added separately.
- Address the patient by name once at the start.
- Mention the clinic name once.
- Output ONLY the script text. No quotes, no labels, no JSON.`

function buildUserPrompt(ctx: ScriptContext): string {
  switch (ctx.type) {
    case 'appointment_24h':
      return `Reminder: tomorrow's appointment.
Patient: ${ctx.patientName}
Clinic: ${ctx.clinicName}
Doctor: ${ctx.doctorName}
When: ${ctx.appointmentDateText}, ${ctx.appointmentTimeText}
Language: ${ctx.language}
Write the script.`
    case 'appointment_2h':
      return `Reminder: appointment in about 2 hours.
Patient: ${ctx.patientName}
Clinic: ${ctx.clinicName}
Doctor: ${ctx.doctorName}
When: today at ${ctx.appointmentTimeText}
Language: ${ctx.language}
Write the script.`
    case 'post_visit':
      return `Post-visit check-in, 3 days after consultation.
Patient: ${ctx.patientName}
Clinic: ${ctx.clinicName}
Doctor: ${ctx.doctorName}
Ask if they're feeling better and if any issues, to call the clinic back.
Language: ${ctx.language}
Write the script.`
    case 'birthday':
      return `Birthday greeting + gentle annual checkup reminder.
Patient: ${ctx.patientName}
Clinic: ${ctx.clinicName}
Language: ${ctx.language}
Write the script.`
    case 'annual_checkup':
      return `Annual checkup reminder — it's been ~1 year since last visit.
Patient: ${ctx.patientName}
Clinic: ${ctx.clinicName}
Language: ${ctx.language}
Write the script.`
    case 'broadcast':
      return `Clinic-wide broadcast. Convey this message naturally:
"${ctx.customMessage}"
Patient: ${ctx.patientName}
Clinic: ${ctx.clinicName}
Language: ${ctx.language}
Write the script.`
  }
}

/**
 * Fallback hardcoded scripts so we always have something to say even if the
 * LLM is down. These are deliberately bland but safe.
 */
function fallbackScript(ctx: ScriptContext): string {
  const name = ctx.patientName || 'Sir'
  const clinic = ctx.clinicName
  switch (ctx.type) {
    case 'appointment_24h':
      return `Namaste ${name}. Yeh ${clinic} se reminder hai. Kal ${ctx.appointmentTimeText} pe ${ctx.doctorName} ke saath aapka appointment hai.`
    case 'appointment_2h':
      return `Namaste ${name}. ${clinic} se reminder. Aaj ${ctx.appointmentTimeText} pe ${ctx.doctorName} ke saath aapka appointment hai, kareeb 2 ghante baad.`
    case 'post_visit':
      return `Namaste ${name}. ${clinic} se follow-up call hai. Aap kaisa feel kar rahe hain? Koi problem ho to clinic ko call karein.`
    case 'birthday':
      return `Namaste ${name}, ${clinic} ki taraf se aapko janamdin ki bahut bahut shubhkamnaayein. Saal mein ek baar checkup zaroor karwayein.`
    case 'annual_checkup':
      return `Namaste ${name}. ${clinic} se reminder hai. Aapke last checkup ko ek saal ho gaya hai, naya appointment book karein.`
    case 'broadcast':
      return `Namaste ${name}. ${clinic} se important message: ${ctx.customMessage}`
  }
}

export async function generateReminderScript(ctx: ScriptContext): Promise<string> {
  // Path 1: clinic provided a template — use it deterministically.
  if (ctx.template && ctx.template.trim().length > 0) {
    return renderTemplate(ctx.template, ctx)
  }

  // Path 2: LLM-generated, with hardcoded fallback if the call fails.
  try {
    const messages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(ctx) },
    ]
    const result = await chatCompletion(messages, {
      temperature: 0.4,
      maxTokens: 120,
      withFallback: true,
    })
    const text = result.content.trim().replace(/^["']|["']$/g, '')
    if (!text) return fallbackScript(ctx)
    return text
  } catch (err) {
    console.warn('[script-generator] LLM failed, using fallback:', err)
    return fallbackScript(ctx)
  }
}
