// Conversation brain for the voice worker. Mirrors the logic in the Next.js
// turn route (clinic context, knowledge base, plain-text replies with [BOOK]/
// [END] tags, real appointment creation, transcript + finalize persistence).

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const llm = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: { 'X-Title': 'ClinicAI Voice Worker' },
})
// gpt-4o handles Hindi/Indian-language reasoning and instruction-following
// noticeably better than the small models, which matters for a receptionist.
const MODEL = process.env.VOICE_WORKER_MODEL || 'openai/gpt-4o'

/**
 * Loads everything needed for a call and returns a session object that keeps
 * conversation history in memory (no DB round-trip per turn → faster).
 */
export async function createSession(callId) {
  const { data: call } = await db
    .from('calls')
    .select('id, clinic_id, phone_number, patient_id, created_at, clinics(name, phone, email, address, city, country), patients(full_name)')
    .eq('id', callId)
    .single()
  if (!call) throw new Error('call not found: ' + callId)

  const [{ data: cfg }, { data: doctors }] = await Promise.all([
    db.from('voice_agent_config').select('*').eq('clinic_id', call.clinic_id).single(),
    db.from('doctors').select('id, full_name, specialization, department_id, is_active, departments(name)').eq('clinic_id', call.clinic_id).eq('is_active', true),
  ])

  const clinic = call.clinics || {}
  const patientName = call.patients?.full_name || null
  const system = buildPrompt(clinic, cfg, doctors || [], patientName)

  return {
    callId,
    clinicId: call.clinic_id,
    callerPhone: call.phone_number,
    patientId: call.patient_id,
    startedAt: call.created_at,
    doctors: doctors || [],
    language: cfg?.language || 'hi-IN',
    speaker: speakerFor(cfg?.voice_type),
    messages: [{ role: 'system', content: system }],
    greeting: cfg?.greeting_message || `Namaste! ${clinic.name || ''} mein aapka swagat hai. Main aapki kaise madad kar sakta hoon?`,
  }
}

/**
 * Run one turn: append the caller's transcript, get the AI reply, persist both
 * sides, create a booking if tagged, and report whether to end the call.
 * @returns {Promise<{ reply: string, end: boolean }>}
 */
export async function runTurn(session, transcript) {
  session.messages.push({ role: 'user', content: transcript })

  let raw
  try {
    const r = await llm.chat.completions.create({
      model: MODEL,
      messages: session.messages,
      temperature: 0.3,
      max_tokens: 150,
    })
    raw = (r.choices?.[0]?.message?.content || '').trim()
  } catch (err) {
    console.error('[agent] LLM error:', err.message)
    raw = 'Maaf kijiye, thodi dikkat ho rahi hai. Aap dobara bata sakte hain?'
  }

  const { reply: cleaned, booking, end: endTag } = parseTags(raw)
  let reply = cleaned
  let end = endTag

  if (booking) {
    const r = await tryBook(session, booking)
    reply = r.message
    if (r.booked) end = true
  }

  session.messages.push({ role: 'assistant', content: reply })
  await saveTurn(session.callId, transcript, reply)
  if (end) await finalize(session)

  return { reply, end }
}

// ─── prompt + parsing (ported from turn/route.ts) ─────────────────────────────

function buildPrompt(clinic, cfg, doctors, patientName) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' })
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const openDays = Array.isArray(cfg?.working_days) ? cfg.working_days : [1, 2, 3, 4, 5, 6]
  const openDayNames = openDays.slice().sort((a, b) => a - b).map(d => DAY_NAMES[d]).join(', ')
  const hours = cfg?.working_hours_start && cfg?.working_hours_end
    ? `Clinic open days: ${openDayNames}. Hours: ${cfg.working_hours_start}–${cfg.working_hours_end}. This open-days list is authoritative — if it includes Sunday, the clinic IS open Sunday. Do not refuse a day that is in this list.`
    : `Clinic open days: ${openDayNames}.`
  const details = [
    clinic.address || clinic.city ? `Address: ${[clinic.address, clinic.city, clinic.country].filter(Boolean).join(', ')}` : '',
    clinic.phone ? `Phone: ${clinic.phone}` : '',
    clinic.email ? `Email: ${clinic.email}` : '',
  ].filter(Boolean).join('\n')
  const docList = doctors.length
    ? doctors.map(d => `- ${d.full_name}${d.specialization ? ` (${d.specialization})` : ''}${d.departments?.name ? ` — ${d.departments.name}` : ''}`).join('\n')
    : '(No doctors configured — tell caller the front desk will confirm.)'
  const ak = cfg?.ai_knowledge || {}
  const knowledge = [
    ak.specialties ? `Departments: ${ak.specialties}` : '',
    ak.common_symptoms ? `Symptom→Department:\n${ak.common_symptoms}` : '',
    ak.faqs ? `FAQs:\n${ak.faqs}` : '',
  ].filter(Boolean).join('\n\n')
  const tone = (cfg?.booking_rules?.tone || '').trim()
  const custom = (cfg?.booking_rules?.custom_instructions || '').trim()

  return [
    `You are the AI phone receptionist for "${clinic.name || 'the clinic'}".`,
    `You are on a LIVE phone call. Keep replies short (1-2 sentences), warm, natural when spoken.`,
    tone ? `Tone: ${tone}.` : '',
    `Reply in whatever language the caller uses — Hindi, English, Hinglish, Urdu, Maithili, Bhojpuri, Bengali, etc. If the caller switches language or asks to speak another language (e.g. "Maithili mein baat karein"), continue naturally in that language. Never say you cannot speak a language.`,
    hours,
    patientName ? `The caller is ${patientName}.` : '',
    `Today is ${weekday}, ${todayStr}. Convert relative dates to exact YYYY-MM-DD.`,
    details ? `\nClinic details:\n${details}` : '',
    `\nDoctors:\n${docList}`,
    knowledge ? `\nKnowledge base:\n${knowledge}` : '',
    custom ? `\nClinic instructions:\n${custom}` : '',
    ``,
    `Reply in PLAIN TEXT only (no JSON/markdown).`,
    `To BOOK: need patient name, a doctor/department from the list, a date, a time. Ask for what's missing, one at a time. Fee/timing/direction questions are NOT bookings.`,
    `Only after all 4 details + caller confirms, append at the very end: [BOOK: <name> | <doctor or department> | <YYYY-MM-DD> | <HH:MM 24h>]`,
    `When the caller is done, append [END]. The tags are not spoken.`,
  ].filter(Boolean).join('\n')
}

function parseTags(raw) {
  let text = (raw || '').replace(/```[a-z]*\n?/gi, '').trim()
  const end = /\[END\]/i.test(text)
  text = text.replace(/\[END\]/gi, '').trim()
  let booking = null
  const m = text.match(/\[BOOK:\s*([^\]]*)\]?/i)
  if (m) {
    const [name, doctor, date, time] = m[1].split('|').map(s => s.trim())
    if (name) booking = { patient_name: name, doctor, date, time }
    text = text.replace(/\[BOOK:[^\]]*\]?/i, '').trim()
  }
  if (text.startsWith('{')) {
    const r = text.match(/"reply"\s*:\s*"([^"]+)"/)
    if (r) text = r[1]
  }
  return { reply: text || 'Maaf kijiye, dobara boliye?', booking, end }
}

async function tryBook(session, booking) {
  const name = (booking.patient_name || '').trim()
  const date = (booking.date || '').trim()
  const time = normalizeTime(booking.time || '')
  if (!name || !date || !time) {
    return { booked: false, message: 'Booking ke liye thodi aur detail chahiye — naam, date aur time bata dijiye.' }
  }
  const doctor = pickDoctor(session.doctors, booking.doctor)
  if (!doctor) {
    return { booked: false, message: 'Aapki request note kar li. Front desk doctor assign karke confirm karega. Aur kuch?' }
  }
  try {
    let patientId = session.patientId
    if (!patientId) {
      const { data: existing } = await db.from('patients').select('id').eq('clinic_id', session.clinicId).eq('phone', session.callerPhone).maybeSingle()
      if (existing) {
        patientId = existing.id
        await db.from('patients').update({ full_name: name }).eq('id', patientId)
      } else {
        const { data: created } = await db.from('patients').insert({ clinic_id: session.clinicId, full_name: name, phone: session.callerPhone }).select('id').single()
        patientId = created.id
      }
      session.patientId = patientId
      await db.from('calls').update({ patient_id: patientId }).eq('id', session.callId)
    }
    await db.from('appointments').insert({
      clinic_id: session.clinicId, patient_id: patientId, doctor_id: doctor.id,
      appointment_date: date, appointment_time: time, status: 'scheduled', booked_via: 'ai_voice',
    })
    await db.from('calls').update({ outcome: 'booked', call_type: 'booking', intent: 'book_appointment' }).eq('id', session.callId)
    return { booked: true, message: `Ho gaya! Aapka appointment ${doctor.full_name} ke saath ${date} ko ${time.slice(0, 5)} baje book ho gaya. Confirmation message aa jayega. Shukriya!` }
  } catch (err) {
    console.error('[agent] booking failed:', err.message)
    return { booked: false, message: 'Abhi save karne mein dikkat hui. Front desk aapko call karke confirm karega. Aur kuch?' }
  }
}

function pickDoctor(doctors, q) {
  if (!doctors.length) return null
  const s = (q || '').toLowerCase().trim()
  if (s) {
    const byName = doctors.find(d => d.full_name.toLowerCase().includes(s) || s.includes(d.full_name.toLowerCase()))
    if (byName) return byName
    const byDept = doctors.find(d => (d.departments?.name || '').toLowerCase().includes(s) || (d.specialization || '').toLowerCase().includes(s))
    if (byDept) return byDept
  }
  return doctors[0]
}

function normalizeTime(t) {
  const s = (t || '').trim().toLowerCase()
  if (!s) return ''
  const ap = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/)
  if (ap) {
    let h = +ap[1]; const m = ap[2] ? +ap[2] : 0
    if (ap[3] === 'pm' && h < 12) h += 12
    if (ap[3] === 'am' && h === 12) h = 0
    return `${p(h)}:${p(m)}:00`
  }
  const hm = s.match(/^(\d{1,2}):(\d{2})/)
  if (hm) return `${p(+hm[1])}:${p(+hm[2])}:00`
  const h = s.match(/^(\d{1,2})$/)
  if (h) return `${p(+h[1])}:00:00`
  return ''
}
const p = n => String(n).padStart(2, '0')

async function saveTurn(callId, userMsg, aiMsg) {
  try {
    await db.from('conversations').insert([
      { call_id: callId, speaker: 'user', message: userMsg },
      { call_id: callId, speaker: 'ai', message: aiMsg },
    ])
  } catch (e) { console.error('[agent] saveTurn:', e.message) }
}

async function finalize(session) {
  try {
    const dur = session.startedAt ? Math.max(0, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000)) : null
    const { data: c } = await db.from('calls').select('outcome').eq('id', session.callId).single()
    const upd = {}
    if (dur !== null) upd.duration_seconds = dur
    if (!c?.outcome) upd.outcome = 'not_booked'
    if (Object.keys(upd).length) await db.from('calls').update(upd).eq('id', session.callId)
  } catch (e) { console.error('[agent] finalize:', e.message) }
}

// Map clinic voice_type → Sarvam speaker. Female/male Indian voices.
function speakerFor(voiceType) {
  const map = {
    priya: 'anushka', riya: 'vidya', savita: 'manisha',
    arjun: 'abhilash', rahul: 'karun', suresh: 'hitesh',
  }
  return map[voiceType] || 'anushka'
}
