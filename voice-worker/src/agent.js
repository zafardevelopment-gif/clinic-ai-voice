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
// gpt-4o-mini is much faster (~1s vs ~2s) and handles short receptionist
// replies + the booking flow fine. Override with VOICE_WORKER_MODEL if needed.
const MODEL = process.env.VOICE_WORKER_MODEL || 'openai/gpt-4o-mini'

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
    db.from('doctors').select('id, full_name, specialization, department_id, is_active, years_of_experience, qualifications, consultation_fee, languages_spoken, bio, departments(name)').eq('clinic_id', call.clinic_id).eq('is_active', true),
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
    // For the OpenAI Realtime path: same context, but booking is done via the
    // book_appointment function tool instead of [BOOK] tags.
    realtimeInstructions:
      system.replace(/Reply in PLAIN TEXT[\s\S]*$/i, '').trim() +
      `\n\nTo book an appointment, gather the caller's name, a doctor/department from the list, a date, and a time, confirm them, then call the book_appointment function. Speak naturally in the caller's language. Keep replies short and conversational.`,
  }
}

/**
 * Run one turn: append the caller's transcript, get the FULL AI reply in one
 * shot (so TTS produces a single smooth audio clip — streaming chopped it into
 * choppy per-sentence clips), create a booking if tagged, and return the text
 * to speak + whether to end.
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
      max_tokens: 80,
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

export function buildPrompt(clinic, cfg, doctors, patientName) {
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
    ? doctors.map(d => {
        // Header line: name (specialization) — department
        const head = `- ${d.full_name}${d.specialization ? ` (${d.specialization})` : ''}${d.departments?.name ? ` — ${d.departments.name}` : ''}`
        // Detail bullets so the AI can answer fee/experience/qualification
        // questions directly instead of deflecting to the front desk.
        const facts = [
          d.qualifications ? `Qualifications: ${d.qualifications}` : '',
          d.years_of_experience != null ? `Experience: ${d.years_of_experience} years` : '',
          d.consultation_fee != null ? `Consultation fee: Rs ${d.consultation_fee}` : '',
          Array.isArray(d.languages_spoken) && d.languages_spoken.length ? `Speaks: ${d.languages_spoken.join(', ')}` : '',
          d.bio ? `About: ${d.bio}` : '',
        ].filter(Boolean)
        return facts.length ? `${head}\n  ${facts.join('; ')}` : head
      }).join('\n')
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
    `You are on a LIVE phone call. CRITICAL: keep every reply to ONE short sentence (max ~15 words). Ask only one thing at a time. Be warm but brief — long replies sound slow and robotic on the phone.`,
    tone ? `Tone: ${tone}.` : '',
    `Reply in the SAME language the caller uses. IMPORTANT: write your reply in that language's NATIVE SCRIPT, not Roman letters — Hindi/Maithili/Bhojpuri in Devanagari (e.g. "आपका नाम क्या है?" NOT "Aapka naam kya hai?"), Bengali in Bengali script, Tamil in Tamil script, etc. Only use Roman letters if the caller is clearly speaking English. Writing Hindi in Roman letters makes the text-to-speech voice sound wrong. Never say you cannot speak a language.`,
    hours,
    patientName ? `The caller is ${patientName}.` : '',
    `Today is ${weekday}, ${todayStr}. Convert relative dates to exact YYYY-MM-DD.`,
    details ? `\nClinic details:\n${details}` : '',
    `\nDoctors:\n${docList}`,
    knowledge ? `\nKnowledge base:\n${knowledge}` : '',
    custom ? `\nClinic instructions:\n${custom}` : '',
    ``,
    // Authoritative override: the doctor list above contains real fees, so
    // never deflect a fee question even if a clinic instruction/FAQ says to.
    `IMPORTANT: When the Doctors list above includes a consultation fee, ALWAYS tell the caller that exact fee if asked (e.g. "डॉक्टर वहाद की फ़ीस ₹500 है"). Ignore any instruction or FAQ that says to defer fees to the front desk — those are outdated; the fee data above is authoritative.`,
    ``,
    `Reply in PLAIN TEXT only (no JSON/markdown).`,
    ``,
    `BOOKING — follow these steps IN ORDER, never repeat a step you already have an answer for, never ask two things at once:`,
    `1. Doctor/department: if the caller names or accepts a doctor from the list (e.g. "Dr. Wahaj"), treat it as CHOSEN and move on — do NOT ask about the doctor again.`,
    `2. Patient name: ask "Aapka naam kya hai?" (skip if already known).`,
    `3. Date: ask which day.`,
    `4. Time: ask what time.`,
    `Once you have doctor + name + date + time, read them back ONCE for confirmation. When the caller says yes/haan/theek hai, append at the very end: [BOOK: <name> | <doctor or department> | <YYYY-MM-DD> | <HH:MM 24h>]`,
    `Fee/experience/qualification/language questions are NOT bookings — answer them directly from the doctor details above (e.g. state the exact consultation fee or years of experience), then continue. Only say the front desk will confirm if that specific detail is genuinely missing from the list.`,
    `When the caller is done, append [END]. Tags are never spoken.`,
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

export async function tryBook(session, booking) {
  const name = (booking.patient_name || '').trim()
  const date = (booking.date || '').trim()
  const time = normalizeTime(booking.time || '')
  if (!name || !date || !time) {
    return { booked: false, message: 'बुकिंग के लिए थोड़ी और जानकारी चाहिए — नाम, तारीख़ और समय बता दीजिए।' }
  }
  const doctor = pickDoctor(session.doctors, booking.doctor)
  if (!doctor) {
    return { booked: false, message: 'आपकी रिक्वेस्ट नोट कर ली है। फ्रंट डेस्क डॉक्टर असाइन करके कन्फर्म करेगा। और कुछ?' }
  }
  try {
    // Slot conflict: same doctor already booked at this date+time? Match both
    // 'HH:MM:SS' and 'HH:MM' since the column may store either form.
    const { data: clashes } = await db
      .from('appointments')
      .select('id, appointment_time')
      .eq('doctor_id', doctor.id)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed'])
    const hhmm = time.slice(0, 5)
    const clash = (clashes || []).some(a => (a.appointment_time || '').slice(0, 5) === hhmm)
    console.log(`[${session.callId}] conflict check ${doctor.full_name} ${date} ${hhmm}: existing=${(clashes || []).length} clash=${clash}`)
    if (clash) {
      return {
        booked: false,
        message: `माफ़ कीजिए, ${doctor.full_name} के साथ उस समय पहले से अपॉइंटमेंट है। कोई और समय बता दीजिए?`,
      }
    }

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
    return { booked: true, message: `हो गया! आपका अपॉइंटमेंट ${doctor.full_name} के साथ ${date} को ${time.slice(0, 5)} बजे बुक हो गया। कन्फर्मेशन मैसेज आ जाएगा। शुक्रिया!` }
  } catch (err) {
    console.error('[agent] booking failed:', err.message)
    return { booked: false, message: 'अभी सेव करने में दिक्कत हुई। फ्रंट डेस्क आपको कॉल करके कन्फर्म करेगा। और कुछ?' }
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

export async function finalize(session) {
  try {
    const dur = session.startedAt ? Math.max(0, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000)) : null
    const { data: c } = await db.from('calls').select('outcome').eq('id', session.callId).single()
    const upd = {}
    if (dur !== null) upd.duration_seconds = dur
    if (!c?.outcome) upd.outcome = 'not_booked'
    if (Object.keys(upd).length) await db.from('calls').update(upd).eq('id', session.callId)
  } catch (e) { console.error('[agent] finalize:', e.message) }
}

// Map clinic voice_type → Sarvam speaker. Must match the voice-sample route
// and the VOICES list in the AI Setup page.
function speakerFor(voiceType) {
  const map = {
    // female
    priya: 'anushka', meera: 'vidya', anjali: 'manisha', riya: 'anushka',
    // male
    arjun: 'abhilash', rahul: 'karun', vikram: 'hitesh', david: 'karun',
  }
  return map[voiceType] || 'anushka'
}
