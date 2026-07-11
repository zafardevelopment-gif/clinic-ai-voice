/**
 * Text templates for WhatsApp/SMS notifications. Voice reminders keep using
 * src/lib/reminders/script-generator.ts (spoken text has different phrasing
 * needs). Placeholders match the existing reminder_settings.template_*
 * convention: {patient_name} {doctor_name} {date} {time} {clinic_name}.
 */

export type MessageLanguage = 'hi-IN' | 'en-IN'

export interface TemplateVars {
  patient_name: string
  doctor_name?: string
  date?: string
  time?: string
  clinic_name: string
  [key: string]: string | undefined
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match)
}

const TEMPLATES: Record<string, Record<MessageLanguage, string>> = {
  booking_confirmation: {
    'hi-IN': 'Namaste {patient_name}, aapka appointment {clinic_name} mein {date} ko {time} baje {doctor_name} ke saath confirm ho gaya hai.',
    'en-IN': 'Hi {patient_name}, your appointment at {clinic_name} with {doctor_name} on {date} at {time} is confirmed.',
  },
  appointment_24h: {
    'hi-IN': 'Reminder: kal {time} baje {clinic_name} mein {doctor_name} ke saath aapka appointment hai. Confirm karne ke liye reply karein YES, reschedule ke liye RESCHEDULE.',
    'en-IN': 'Reminder: you have an appointment tomorrow at {time} with {doctor_name} at {clinic_name}. Reply YES to confirm, RESCHEDULE to change.',
  },
  appointment_2h: {
    'hi-IN': 'Aapka appointment 2 ghante mein hai — {time} baje {clinic_name} mein {doctor_name} ke saath.',
    'en-IN': 'Your appointment is in 2 hours — {time} at {clinic_name} with {doctor_name}.',
  },
  post_visit: {
    'hi-IN': 'Namaste {patient_name}, {clinic_name} ki taraf se follow-up. Aap kaisa mehsoos kar rahe hain? Koi dikkat ho to bataiye.',
    'en-IN': 'Hi {patient_name}, following up from {clinic_name} on your recent visit. How are you feeling? Let us know if you need anything.',
  },
  medication: {
    'hi-IN': 'Reminder: apni dawa lena na bhoolein. Reply karein TAKEN (le li), MISSED (chhoot gayi), ya SIDE_EFFECTS agar koi problem ho.',
    'en-IN': 'Reminder: please take your medicine as prescribed. Reply TAKEN, MISSED, or SIDE_EFFECTS if you notice anything unusual.',
  },
  follow_up_visit: {
    'hi-IN': 'Namaste {patient_name}, aapki follow-up visit {clinic_name} mein {date} ko hai. Kripya samay par aayein.',
    'en-IN': 'Hi {patient_name}, your follow-up visit at {clinic_name} is on {date}. Please plan to arrive on time.',
  },
}

export function getPatientMessageTemplate(type: keyof typeof TEMPLATES, language: MessageLanguage): string {
  return TEMPLATES[type]?.[language] ?? TEMPLATES[type]?.['en-IN'] ?? ''
}
