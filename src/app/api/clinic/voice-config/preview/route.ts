/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { chatCompletion, parseJsonResponse, type LlmMessage } from '@/lib/ai/openrouter'

/**
 * POST /api/clinic/voice-config/preview
 *
 * Text "test the AI" feature for the AI Setup page. Runs the SAME receptionist
 * prompt the live phone agent uses, but as a chat — no Twilio, no DB writes.
 * Lets the clinic try greetings, knowledge base, and personality before going
 * live.
 *
 * Body: { messages: [{ role: 'user' | 'assistant', content }] }
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const { messages: history } = (await req.json()) as {
    messages: { role: 'user' | 'assistant'; content: string }[]
  }
  if (!Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 })
  }

  const db = getDb() as any
  const [{ data: clinic }, { data: cfg }, { data: doctors }] = await Promise.all([
    db.from('clinics').select('name, phone, email, address, city, country').eq('id', clinicId).single(),
    db.from('voice_agent_config').select('*').eq('clinic_id', clinicId).single(),
    db
      .from('doctors')
      .select('full_name, specialization, years_of_experience, qualifications, consultation_fee, languages_spoken, bio, departments(name), doctor_availability(day_of_week, start_time, end_time, is_available)')
      .eq('clinic_id', clinicId)
      .eq('is_active', true),
  ])

  const messages: LlmMessage[] = [
    { role: 'system', content: buildPreviewPrompt(clinic, cfg, doctors || []) },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ]

  try {
    const result = await chatCompletion(messages, {
      withFallback: true,
      temperature: 0.4,
      maxTokens: 220,
    })
    // The prompt asks for JSON; extract just the spoken reply for the chat UI.
    let reply = result.content?.trim() || ''
    try {
      const obj = parseJsonResponse<{ reply?: string }>(reply)
      if (obj?.reply) reply = obj.reply
    } catch {
      const m = reply.match(/"reply"\s*:\s*"([^"]+)"/)
      if (m) reply = m[1]
    }
    return NextResponse.json({ reply: reply || 'Sorry, could you say that again?' })
  } catch (err) {
    console.error('[voice-config/preview] LLM failed:', err)
    return NextResponse.json({ error: 'AI is unavailable right now' }, { status: 502 })
  }
}

// Render a doctor's weekly schedule as a compact line, e.g.
// "Available: Mon–Sat 09:00–17:00" style (one entry per working day).
function weeklySchedule(avail: any[]): string {
  if (!Array.isArray(avail) || !avail.length) return ''
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = avail
    .filter(a => a.is_available)
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map(a => `${DAY[a.day_of_week]} ${(a.start_time || '').slice(0, 5)}–${(a.end_time || '').slice(0, 5)}`)
  return days.length ? `Available: ${days.join(', ')}` : 'Available: (no working days set)'
}

function buildPreviewPrompt(clinic: any, cfg: any, doctors: any[]): string {
  const clinicName = clinic?.name || 'the clinic'
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' })

  const clinicDetails = clinic
    ? [
        clinic.address || clinic.city
          ? `Address: ${[clinic.address, clinic.city, clinic.country].filter(Boolean).join(', ')}`
          : '',
        clinic.phone ? `Clinic phone: ${clinic.phone}` : '',
        clinic.email ? `Clinic email: ${clinic.email}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  // Same per-clinic detail toggles the live voice agent uses, so the test
  // chat behaves identically to a real call.
  const share = cfg?.booking_rules?.share_doctor_info || {}
  const may = (key: string) => share[key] !== false
  const doctorList = doctors.length
    ? doctors
        .map((d: any) => {
          const spec = may('specialization') && d.specialization ? ` (${d.specialization})` : ''
          const head = `- ${d.full_name}${spec}${d.departments?.name ? ` — ${d.departments.name}` : ''}`
          const facts = [
            may('qualifications') && d.qualifications ? `Qualifications: ${d.qualifications}` : '',
            may('experience') && d.years_of_experience != null ? `Experience: ${d.years_of_experience} years` : '',
            may('fee') && d.consultation_fee != null ? `Consultation fee: Rs ${d.consultation_fee}` : '',
            may('languages') && Array.isArray(d.languages_spoken) && d.languages_spoken.length ? `Speaks: ${d.languages_spoken.join(', ')}` : '',
            weeklySchedule(d.doctor_availability),
            d.bio ? `About: ${d.bio}` : '',
          ].filter(Boolean)
          return facts.length ? `${head}\n  ${facts.join('; ')}` : head
        })
        .join('\n')
    : '(No doctors configured yet.)'

  const ak = cfg?.ai_knowledge || {}
  const knowledge = [
    ak.specialties ? `Departments/Specialties: ${ak.specialties}` : '',
    ak.common_symptoms ? `Symptom → Department guide:\n${ak.common_symptoms}` : '',
    ak.faqs ? `FAQs:\n${ak.faqs}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const tone = (cfg?.booking_rules?.tone || '').trim()
  const custom = (cfg?.booking_rules?.custom_instructions || '').trim()

  return [
    `You are the AI phone receptionist for "${clinicName}". This is a TEST chat preview for the clinic owner.`,
    `Keep replies short (1-2 sentences), warm, natural.`,
    tone ? `Speak in a ${tone} tone.` : '',
    `You may speak English, Hindi, or Hinglish to match the user.`,
    `Today is ${weekday}, ${todayStr}.`,
    clinicDetails ? `\nClinic details:\n${clinicDetails}` : '',
    ``,
    `Doctors available:`,
    doctorList,
    knowledge ? `\nClinic knowledge base:\n${knowledge}` : '',
    custom ? `\nClinic instructions:\n${custom}` : '',
    ``,
    `Help with appointments, timings, doctors, and FAQs. Never invent doctors/prices not listed.`,
    `If a doctor detail (fee, experience, qualifications, languages) is shown above, share that exact value when asked. If it is NOT shown, say the front desk will confirm it.`,
    `For "is the doctor available / what days/times" questions, use each doctor's "Available:" weekly schedule above. If asked about a day the doctor does not work, say so and suggest a working day.`,
    `Reply with ONLY a JSON object: {"reply": "<what you say>"}`,
  ]
    .filter(Boolean)
    .join('\n')
}
