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

  // Doctors query is wrapped so a schema/relation error can NEVER stop the
  // greeting — a failed doctor list just degrades to an empty list.
  const [{ data: cfg }, doctorsRes] = await Promise.all([
    db.from('voice_agent_config').select('*').eq('clinic_id', call.clinic_id).single(),
    db.from('doctors')
      .select('id, full_name, specialization, department_id, is_active, years_of_experience, qualifications, consultation_fee, languages_spoken, bio, slot_duration_minutes, booking_min_hours, departments(name), doctor_availability(day_of_week, start_time, end_time, is_available)')
      .eq('clinic_id', call.clinic_id)
      .eq('is_active', true)
      .then(r => r, err => ({ data: null, error: err })),
  ])
  if (doctorsRes?.error) console.error('[agent] doctors query failed:', doctorsRes.error.message || doctorsRes.error)
  const doctors = doctorsRes?.data || []

  const clinic = call.clinics || {}
  const patientName = call.patients?.full_name || null
  // Build the prompt WITHOUT availability first so the greeting can play
  // immediately. Availability (which needs an extra appointments query) is
  // computed in the background and spliced into the system message below —
  // it's ready well before the caller asks their first question.
  const baseSystem = buildPrompt(clinic, cfg, doctors || [], patientName, '')

  const session = {
    callId,
    clinicId: call.clinic_id,
    callerPhone: call.phone_number,
    patientId: call.patient_id,
    callerName: patientName, // the registered name for this phone, if known
    startedAt: call.created_at,
    doctors: doctors || [],
    language: cfg?.language || 'hi-IN',
    speaker: speakerFor(cfg?.voice_type),
    messages: [{ role: 'system', content: baseSystem }],
    greeting: clarifyGreeting(cfg?.greeting_message, clinic.name),
    // For the OpenAI Realtime path: same context, but booking is done via the
    // book_appointment function tool instead of [BOOK] tags.
    realtimeInstructions:
      baseSystem.replace(/Reply in PLAIN TEXT[\s\S]*$/i, '').trim() +
      `\n\nTo book an appointment, gather the caller's name, a doctor/department from the list, a date, and a time, confirm them, then call the book_appointment function. Speak naturally in the caller's language. Keep replies short and conversational.`,
  }

  // Compute availability AND the caller's existing-booking context in the
  // background, then splice both into the system prompt in ONE update (so the
  // greeting isn't delayed and the two patches don't overwrite each other).
  Promise.all([
    buildAvailabilityText(doctors || []),
    buildCallerContext(session, patientName),
  ])
    .then(([availText, callerInfo]) => {
      if (availText || callerInfo) {
        session.messages[0].content = buildPrompt(clinic, cfg, doctors || [], patientName, availText, callerInfo)
      }
    })
    .catch(err => console.error('[agent] context compute failed:', err.message))

  return session
}

/**
 * Exotel VoiceBot path: no pre-created callId.
 * Look up clinic from the dialed number, find/create patient, create call record,
 * then build a full session object identical to createSession().
 */
export async function createSessionFromPhone(toNumber, fromNumber) {
  // Build number variants (Indian mobile: 10-digit, 0-prefix, +91, 91)
  function variants(raw) {
    const d = (raw || '').replace(/\D/g, '')
    const s = new Set([raw, d])
    if (d.length === 10) { s.add('0'+d); s.add('+91'+d); s.add('91'+d) }
    if (d.length === 11 && d.startsWith('0')) { const t=d.slice(1); s.add(t); s.add('+91'+t); s.add('91'+t) }
    if (d.length === 12 && d.startsWith('91')) { const t=d.slice(2); s.add(t); s.add('0'+t); s.add('+91'+t) }
    return [...s]
  }

  // Find clinic by dialed number
  let clinicRow = null
  for (const num of variants(toNumber)) {
    const { data } = await db.from('clinics').select('id, name, phone, email, address, city, country').eq('twilio_number', num).eq('is_active', true).single()
    if (data) { clinicRow = data; break }
  }
  if (!clinicRow) {
    for (const num of variants(toNumber)) {
      const { data } = await db.from('clinics').select('id, name, phone, email, address, city, country').eq('phone', num).eq('is_active', true).single()
      if (data) { clinicRow = data; break }
    }
  }
  // Last resort: load first active clinic (works for single-clinic deployments
  // where Exotel doesn't pass the To number in custom params).
  if (!clinicRow) {
    console.warn(`[agent] clinic not found for "${toNumber}", falling back to first active clinic`)
    const { data } = await db.from('clinics').select('id, name, phone, email, address, city, country').eq('is_active', true).limit(1).single()
    clinicRow = data || null
  }
  if (!clinicRow) throw new Error(`no active clinic found`)

  // Find patient by caller number
  let patientRow = null
  if (fromNumber) {
    const { data } = await db.from('patients').select('id, full_name').eq('clinic_id', clinicRow.id).eq('phone', fromNumber).maybeSingle()
    patientRow = data || null
  }

  // Create call record
  const { data: call } = await db
    .from('calls')
    .insert({ clinic_id: clinicRow.id, phone_number: fromNumber || 'unknown', patient_id: patientRow?.id || null, call_type: 'query' })
    .select('id, created_at')
    .single()
  if (!call) throw new Error('failed to create call record')

  // Load config + doctors
  const [{ data: cfg }, doctorsRes] = await Promise.all([
    db.from('voice_agent_config').select('*').eq('clinic_id', clinicRow.id).single(),
    db.from('doctors').select('id, full_name, specialization, department_id, is_active, departments(name)').eq('clinic_id', clinicRow.id).eq('is_active', true).then(r => r, err => ({ data: null, error: err })),
  ])
  const doctors = doctorsRes?.data || []
  const patientName = patientRow?.full_name || null
  const baseSystem = buildPrompt(clinicRow, cfg, doctors, patientName, '')

  const session = {
    callId: call.id,
    clinicId: clinicRow.id,
    callerPhone: fromNumber || 'unknown',
    patientId: patientRow?.id || null,
    callerName: patientName,
    startedAt: call.created_at,
    doctors,
    language: cfg?.language || 'hi-IN',
    speaker: speakerFor(cfg?.voice_type),
    messages: [{ role: 'system', content: baseSystem }],
    greeting: clarifyGreeting(cfg?.greeting_message, clinicRow.name),
    realtimeInstructions: baseSystem,
  }

  // Load availability in background (don't delay greeting)
  Promise.all([
    buildAvailabilityText(doctors),
    buildCallerContext(session, patientName),
  ]).then(([availText, callerInfo]) => {
    if (availText || callerInfo) {
      session.messages[0].content = buildPrompt(clinicRow, cfg, doctors, patientName, availText, callerInfo)
    }
  }).catch(err => console.error('[agent] context compute failed:', err.message))

  return session
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

  const { reply: cleaned, booking, reschedule, cancel, end: endTag } = parseTags(raw)
  let reply = cleaned
  let end = endTag

  if (booking) {
    const r = await tryBook(session, booking)
    reply = r.message
    if (r.booked) end = true
  } else if (reschedule) {
    const r = await tryReschedule(session, reschedule)
    reply = r.message
    if (r.done) end = true
  } else if (cancel) {
    const r = await tryCancel(session, { patient: cancel.patient })
    reply = r.message
    if (r.done) end = true
  }

  session.messages.push({ role: 'assistant', content: reply })
  await saveTurn(session.callId, transcript, reply)
  if (end) await finalize(session)

  return { reply, end }
}

// ─── prompt + parsing (ported from turn/route.ts) ─────────────────────────────

export function buildPrompt(clinic, cfg, doctors, patientName, availabilityText, callerInfo) {
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
  // Per-clinic toggles for which doctor details the AI may share. Defaults to
  // sharing everything when not configured.
  const share = cfg?.booking_rules?.share_doctor_info || {}
  const may = (key) => share[key] !== false
  // Reschedule/cancel are opt-in per clinic (default: reschedule on, cancel off
  // — matches the AI Setup defaults).
  const allowReschedule = cfg?.booking_rules?.allow_reschedule !== false
  const allowCancel = cfg?.booking_rules?.allow_cancel === true
  const docList = doctors.length
    ? doctors.map(d => {
        // Header line: name (specialization, if allowed) — department
        const spec = may('specialization') && d.specialization ? ` (${d.specialization})` : ''
        const head = `- ${d.full_name}${spec}${d.departments?.name ? ` — ${d.departments.name}` : ''}`
        // Detail bullets — only include the ones the clinic allows so the AI
        // can answer those questions directly instead of deflecting.
        const facts = [
          may('qualifications') && d.qualifications ? `Qualifications: ${d.qualifications}` : '',
          may('experience') && d.years_of_experience != null ? `Experience: ${d.years_of_experience} years` : '',
          may('fee') && d.consultation_fee != null ? `Consultation fee: Rs ${d.consultation_fee}` : '',
          may('languages') && Array.isArray(d.languages_spoken) && d.languages_spoken.length ? `Speaks: ${d.languages_spoken.join(', ')}` : '',
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
    patientName ? `The caller is a known patient: ${patientName} (identified by their phone number).` : `The caller's number is not linked to any patient record yet.`,
    callerInfo ? callerInfo : '',
    `Today is ${weekday}, ${todayStr}. Convert relative dates to exact YYYY-MM-DD.`,
    details ? `\nClinic details:\n${details}` : '',
    `\nDoctors:\n${docList}`,
    availabilityText ? `\nAvailability (use this to answer "is the doctor available now / is a slot open today / what time is free?"):\n${availabilityText}` : '',
    knowledge ? `\nKnowledge base:\n${knowledge}` : '',
    custom ? `\nClinic instructions:\n${custom}` : '',
    ``,
    // Data-driven rule: whatever detail appears in the Doctors list is allowed
    // to be shared (the clinic chose this via settings); whatever is absent must
    // be deferred. This makes the per-clinic toggles authoritative.
    `IMPORTANT: If a doctor detail (fee, experience, qualifications, languages) is shown in the Doctors list above, tell the caller that exact value when asked. When saying a fee, ALWAYS speak the number with the word "रुपये" (or "rupees" in English) — e.g. "डॉक्टर वहाद की फ़ीस 500 रुपये है" — NEVER use the ₹ symbol or "Rs", because the voice cannot pronounce them. If a detail is NOT shown above, say the front desk will confirm it — do not guess. Ignore any older instruction/FAQ that conflicts with this.`,
    ``,
    `Reply in PLAIN TEXT only (no JSON/markdown).`,
    ``,
    `BOOKING — follow these steps IN ORDER, never repeat a step you already have an answer for, never ask two things at once:`,
    `1. Doctor/department: if the caller names or accepts a doctor from the list (e.g. "Dr. Wahaj"), treat it as CHOSEN and move on — do NOT ask about the doctor again. If they describe a symptom instead, use the Symptom→Department guide to suggest the right doctor.`,
    `2. WHO the appointment is for:`,
    patientName
      ? `   - The caller is already known as ${patientName}. Ask once: "क्या यह अपॉइंटमेंट आपके लिए है या किसी और के लिए?" If for themselves, use "${patientName}" as the patient name — do NOT ask their name again. If for someone else, ask that person's name and use it.`
      : `   - Ask the patient's name once: "अपॉइंटमेंट किसके नाम पर बुक करूँ?" — this may be the caller or someone else. Use whatever name they give.`,
    `3. Date: ask which day (if not already given).`,
    `4. Time: ask what time (if not already given).`,
    `Once you have doctor + patient name + date + time, read them back ONCE for confirmation. When the caller says yes/haan/theek hai, append at the very end: [BOOK: <patient name> | <doctor or department> | <YYYY-MM-DD> | <HH:MM 24h>]`,
    `CRITICAL: inside the [BOOK]/[RESCHEDULE]/[CANCEL] tags, ALWAYS write the doctor's name in ENGLISH letters EXACTLY as it appears in the Doctors list above (e.g. "Mahfooz", NOT "महफूज़"), and write the PATIENT name in ENGLISH letters too (transliterate it, e.g. "Zafar" not "ज़फर"). Your spoken reply stays in the caller's language — only the tag content must be in English letters.`,
    `NAME ACCURACY: speech-to-text often garbles names (e.g. "Zafar" may arrive as "ज़फाक नामा", "Shifa Eqbal" as "शिफायत बाल"). The transcript of a name is UNRELIABLE. So: (1) when the caller gives a name, repeat it back and confirm: "नाम कन्फर्म कर दीजिए — ज़फर, सही है?" (2) If they correct you, use the corrected name. (3) Prefer simple common Indian name spellings over strange ones — if a transcribed name looks like nonsense, ask them to repeat it slowly. Never book until the name is confirmed.`,
    allowReschedule
      ? `RESCHEDULE / CHANGE: if the caller wants to move an existing appointment, ask for the NEW date and/or time. If their number has more than one upcoming appointment (see Caller's existing appointments above), also confirm WHICH patient. Once confirmed, append at the very end: [RESCHEDULE: <patient name or blank> | <YYYY-MM-DD> | <HH:MM 24h>]`
      : `If a caller asks to change/reschedule an appointment, tell them the front desk will handle that and offer to take a message.`,
    allowCancel
      ? `CANCEL: if the caller wants to cancel, confirm once (and WHICH patient, if multiple), then append at the very end: [CANCEL: <patient name or blank>]`
      : `If a caller asks to cancel, tell them the front desk will handle cancellations.`,
    `Fee/experience/qualification/language questions are NOT bookings — answer them directly from the doctor details above (e.g. state the exact consultation fee or years of experience), then continue. Only say the front desk will confirm if that specific detail is genuinely missing from the list.`,
    `AVAILABILITY questions ("is Dr X available now?", "abhi slot khula hai?", "aaj kitne baje free hai?") are NOT bookings — answer from the Availability section above: if the doctor is open now and has open slots today, say yes and offer the next 1-2 open times; if closed today or fully booked, say so and offer the next working day. Do NOT invent times not listed.`,
    ``,
    `HANDLE THESE BOOKING SCENARIOS:`,
    `- Slot already taken: if booking fails for a clash, you'll be told — offer the next available time.`,
    `- Doctor not working that day / outside hours: suggest the nearest day the doctor is available (see Availability/open days).`,
    `- Caller unsure which doctor: ask the reason/symptom and suggest a department/doctor from the list.`,
    `- Multiple people on one phone: the same caller may book for several family members; always confirm the patient's name for THIS booking. When rescheduling/cancelling and more than one appointment exists, ask which patient.`,
    `- Returning caller with an existing appointment: in your VERY FIRST reply of the call (whatever they say first), acknowledge it and offer the choices, e.g. "आपका <doctor> के साथ <date> को अपॉइंटमेंट पहले से बुक है — क्या आप उसे बदलना चाहेंगे, कैंसिल करना चाहेंगे, या कोई नई बुकिंग करनी है?" Then handle their choice. Do this only ONCE — do not repeat it later in the call.`,
    `- If they choose "change/badalna": follow the RESCHEDULE flow (ask new date/time, then [RESCHEDULE: ...]).`,
    `- If they choose "cancel": follow the CANCEL flow ([CANCEL: ...]).`,
    `- If they choose "nayi booking": run the normal BOOKING steps; if it's for a different person (family member), ask that person's name and book under it.`,
    `- If the caller's number has multiple upcoming appointments, list them briefly and ask WHICH one they mean before changing/cancelling.`,
    `- Vague date/time ("subah", "shaam", "jaldi"): ask for a specific day and clock time before booking.`,
    `- Caller gives only partial info: ask ONLY for the missing piece, never re-ask what you already have.`,
    `- Emergency / urgent medical wording: tell them to contact emergency services or come immediately; do not just book a future slot.`,
    `When the caller is done, append [END]. Tags are never spoken.`,
  ].filter(Boolean).join('\n')
}

function parseTags(raw) {
  let text = (raw || '').replace(/```[a-z]*\n?/gi, '').trim()
  const end = /\[END\]/i.test(text)
  text = text.replace(/\[END\]/gi, '').trim()

  let cancel = null
  const cm = text.match(/\[CANCEL:?\s*([^\]]*)\]?/i)
  if (cm) {
    cancel = { patient: (cm[1] || '').trim() }
    text = text.replace(/\[CANCEL:?[^\]]*\]?/i, '').trim()
  }

  let booking = null
  const m = text.match(/\[BOOK:\s*([^\]]*)\]?/i)
  if (m) {
    const [name, doctor, date, time] = m[1].split('|').map(s => s.trim())
    if (name) booking = { patient_name: name, doctor, date, time }
    text = text.replace(/\[BOOK:[^\]]*\]?/i, '').trim()
  }

  let reschedule = null
  const rm = text.match(/\[RESCHEDULE:\s*([^\]]*)\]?/i)
  if (rm) {
    const parts = rm[1].split('|').map(s => s.trim())
    // New 3-part form: <patient> | <date> | <time>. Tolerate old 2-part form.
    let patient = '', date = '', time = ''
    if (parts.length >= 3) [patient, date, time] = parts
    else [date, time] = parts
    if (date || time) reschedule = { patient, date, time }
    text = text.replace(/\[RESCHEDULE:[^\]]*\]?/i, '').trim()
  }

  if (text.startsWith('{')) {
    const r = text.match(/"reply"\s*:\s*"([^"]+)"/)
    if (r) text = r[1]
  }
  return { reply: text || 'Maaf kijiye, dobara boliye?', booking, reschedule, cancel, end }
}

export async function tryBook(session, booking) {
  const name = (booking.patient_name || '').trim()
  const date = (booking.date || '').trim()
  const time = normalizeTime(booking.time || '')
  if (!name || !date || !time) {
    return { booked: false, message: 'बुकिंग के लिए थोड़ी और जानकारी चाहिए — नाम, तारीख़ और समय बता दीजिए।' }
  }
  // Date sanity: must be a valid YYYY-MM-DD and not in the past (IST).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(`${date}T00:00:00`).getTime())) {
    return { booked: false, message: 'तारीख़ समझ नहीं आई — कृपया दिन दोबारा बता दीजिए।' }
  }
  const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
  if (date < todayIST) {
    return { booked: false, message: 'यह तारीख़ बीत चुकी है — आने वाली कोई तारीख़ बता दीजिए।' }
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

    // Resolve the patient this appointment is FOR. It may be the caller, or
    // someone else they're booking for. We decide by comparing the booked name
    // with the caller's known name.
    const sameName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()
    const bookingForCaller = !session.callerName || sameName(name, session.callerName)

    let patientId
    let isNewPatient = false
    if (bookingForCaller && session.patientId) {
      // Known caller booking for themselves — reuse their record, no queries.
      patientId = session.patientId
    } else {
      // Either an unknown caller, or booking for someone else. Find an existing
      // patient with this phone + name; otherwise create one. Keying on name
      // too means a family member booked from the same phone gets their own
      // record instead of overwriting the caller's.
      const { data: existing } = await db
        .from('patients')
        .select('id')
        .eq('clinic_id', session.clinicId)
        .eq('phone', session.callerPhone)
        .ilike('full_name', name)
        .maybeSingle()
      if (existing) {
        patientId = existing.id
      } else {
        const { data: created } = await db.from('patients').insert({ clinic_id: session.clinicId, full_name: name, phone: session.callerPhone }).select('id').single()
        patientId = created.id
        isNewPatient = true
      }
      // Only adopt this as the caller's own record if it's actually the caller.
      if (bookingForCaller) {
        session.patientId = patientId
        session.callerName = name
      }
    }

    // The appointment insert is the ONLY write the caller must wait on — we
    // can't say "booked" until it succeeds.
    const { error: apptErr } = await db.from('appointments').insert({
      clinic_id: session.clinicId, patient_id: patientId, doctor_id: doctor.id,
      appointment_date: date, appointment_time: time, status: 'scheduled', booked_via: 'ai_voice',
    })
    if (apptErr) throw apptErr

    // Merge what used to be two separate `calls` updates into one. Awaited so
    // finalize() (runs right after on [END]) can't race and overwrite the
    // 'booked' outcome with 'not_booked'. Still saves a round-trip vs before.
    const callUpdate = { outcome: 'booked', call_type: 'booking', intent: 'book_appointment' }
    if (isNewPatient) callUpdate.patient_id = patientId
    await db.from('calls').update(callUpdate).eq('id', session.callId)

    return { booked: true, message: `हो गया! आपका अपॉइंटमेंट ${doctor.full_name} के साथ ${date} को ${time.slice(0, 5)} बजे बुक हो गया। शुक्रिया!` }
  } catch (err) {
    console.error('[agent] booking failed:', err.message)
    return { booked: false, message: 'अभी सेव करने में दिक्कत हुई। फ्रंट डेस्क आपको कॉल करके कन्फर्म करेगा। और कुछ?' }
  }
}

// Summarize the caller's existing UPCOMING appointments (there can be several —
// the same phone may book for multiple family members). Lets the AI proactively
// say "you already have an appointment with Dr X on..." and disambiguate when
// rescheduling/cancelling. Returns a prompt line, or '' if none.
async function buildCallerContext(session, patientName) {
  // Resolve patient id(s) on this phone. A phone can map to several patients
  // (family booking from one number), so fetch ALL of them.
  const { data: patients } = await db
    .from('patients')
    .select('id, full_name')
    .eq('clinic_id', session.clinicId)
    .eq('phone', session.callerPhone)
  if (!patients || !patients.length) return ''

  const byId = {}
  for (const p of patients) byId[p.id] = p.full_name
  const today = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000).toISOString().slice(0, 10)
  const { data: appts } = await db
    .from('appointments')
    .select('patient_id, appointment_date, appointment_time, doctors(full_name)')
    .in('patient_id', patients.map(p => p.id))
    .in('status', ['scheduled', 'confirmed'])
    .gte('appointment_date', today)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  if (!appts || !appts.length) {
    return `\nCaller history: this number is registered to ${patients.map(p => p.full_name).join(', ')} but has no upcoming appointments. You may proactively offer to book one.`
  }
  const lines = appts.map(a =>
    `- ${byId[a.patient_id] || 'patient'}: ${a.doctors?.full_name || 'doctor'} on ${a.appointment_date} at ${(a.appointment_time || '').slice(0, 5)}`)
  return `\nCaller's existing upcoming appointments (this phone may cover multiple people):\n${lines.join('\n')}\nUse this to greet returning patients ("aapka ${appts[0].doctors?.full_name || 'doctor'} ke saath appointment ${appts[0].appointment_date} ko hai") and, when they want to reschedule/cancel and have more than one, ask WHICH patient/appointment they mean.`
}

// Find the caller's upcoming appointments so we can reschedule/cancel. A single
// phone may have MULTIPLE patients (family) and multiple appointments, so this
// returns { appts, patientsByName }. `nameHint` (optional) narrows to a
// specific person. Each appt row includes the patient name for disambiguation.
async function findUpcomingAppointments(session, nameHint) {
  // All patients registered to this phone.
  const { data: patients } = await db
    .from('patients')
    .select('id, full_name')
    .eq('clinic_id', session.clinicId)
    .eq('phone', session.callerPhone)
  if (!patients || !patients.length) return { appts: [] }

  const nameById = {}
  for (const p of patients) nameById[p.id] = p.full_name
  const today = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000).toISOString().slice(0, 10)
  const { data } = await db
    .from('appointments')
    .select('id, patient_id, doctor_id, appointment_date, appointment_time, doctors(full_name)')
    .in('patient_id', patients.map(p => p.id))
    .in('status', ['scheduled', 'confirmed'])
    .gte('appointment_date', today)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  let appts = (data || []).map(a => ({ ...a, patient_name: nameById[a.patient_id] || null }))
  const hint = (nameHint || '').trim().toLowerCase()
  if (hint) {
    const matched = appts.filter(a => (a.patient_name || '').toLowerCase().includes(hint) || hint.includes((a.patient_name || '').toLowerCase()))
    if (matched.length) appts = matched
  }
  return { appts }
}

export async function tryReschedule(session, change) {
  const { appts } = await findUpcomingAppointments(session, change.patient)
  if (!appts.length) {
    return { done: false, message: 'मुझे आपके नाम पर कोई आने वाला अपॉइंटमेंट नहीं मिला। क्या आप नया अपॉइंटमेंट बुक करना चाहेंगे?' }
  }
  if (appts.length > 1) {
    // Multiple upcoming (e.g. several family members) — ask which one.
    const opts = appts.map(a => `${a.patient_name || 'patient'} (${a.doctors?.full_name || 'doctor'}, ${a.appointment_date})`).join('; ')
    return { done: false, message: `आपके नंबर पर कई अपॉइंटमेंट हैं: ${opts}। किसका बदलना है — मरीज़ का नाम बता दीजिए?` }
  }
  const appt = appts[0]
  const newDate = (change.date || '').trim() || appt.appointment_date
  const newTime = normalizeTime(change.time || '') || appt.appointment_time
  if (!newDate || !newTime) {
    return { done: false, message: 'नई तारीख़ और समय बता दीजिए, मैं अपॉइंटमेंट बदल दूँगा।' }
  }
  try {
    // Conflict-check the new slot for the same doctor (ignore this appt itself).
    const { data: clashes } = await db
      .from('appointments')
      .select('id, appointment_time')
      .eq('doctor_id', appt.doctor_id)
      .eq('appointment_date', newDate)
      .in('status', ['scheduled', 'confirmed'])
    const hhmm = newTime.slice(0, 5)
    const clash = (clashes || []).some(a => a.id !== appt.id && (a.appointment_time || '').slice(0, 5) === hhmm)
    if (clash) {
      const docName = appt.doctors?.full_name || 'डॉक्टर'
      return { done: false, message: `माफ़ कीजिए, ${docName} के साथ उस समय पहले से अपॉइंटमेंट है। कोई और समय बता दीजिए?` }
    }
    const { error } = await db.from('appointments').update({ appointment_date: newDate, appointment_time: newTime }).eq('id', appt.id)
    if (error) throw error
    // Awaited (not backgrounded) so finalize() doesn't race and overwrite this.
    await db.from('calls').update({ outcome: 'rescheduled', call_type: 'booking', intent: 'reschedule' }).eq('id', session.callId)
    const docName = appt.doctors?.full_name || 'डॉक्टर'
    return { done: true, message: `हो गया! आपका अपॉइंटमेंट ${docName} के साथ अब ${newDate} को ${hhmm} बजे है। शुक्रिया!` }
  } catch (err) {
    console.error('[agent] reschedule failed:', err.message)
    return { done: false, message: 'अभी बदलने में दिक्कत हुई। फ्रंट डेस्क आपको कॉल करके कन्फर्म करेगा। और कुछ?' }
  }
}

export async function tryCancel(session, opts = {}) {
  const { appts } = await findUpcomingAppointments(session, opts.patient)
  if (!appts.length) {
    return { done: false, message: 'मुझे आपके नाम पर कोई आने वाला अपॉइंटमेंट नहीं मिला। और कुछ मदद चाहिए?' }
  }
  if (appts.length > 1) {
    const list = appts.map(a => `${a.patient_name || 'patient'} (${a.doctors?.full_name || 'doctor'}, ${a.appointment_date})`).join('; ')
    return { done: false, message: `आपके नंबर पर कई अपॉइंटमेंट हैं: ${list}। किसका कैंसिल करना है — मरीज़ का नाम बता दीजिए?` }
  }
  const appt = appts[0]
  try {
    const { error } = await db.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id)
    if (error) throw error
    await db.from('calls').update({ outcome: 'cancelled', call_type: 'booking', intent: 'cancel' }).eq('id', session.callId)
    const docName = appt.doctors?.full_name || 'डॉक्टर'
    return { done: true, message: `आपका ${docName} के साथ ${appt.appointment_date} का अपॉइंटमेंट कैंसिल कर दिया गया है। शुक्रिया!` }
  } catch (err) {
    console.error('[agent] cancel failed:', err.message)
    return { done: false, message: 'अभी कैंसिल करने में दिक्कत हुई। फ्रंट डेस्क आपको कॉल करके कन्फर्म करेगा। और कुछ?' }
  }
}

// Basic Devanagari → Latin transliteration so a doctor name written in Hindi
// script ("महफूज़") can still match the Latin DB name ("Mahfooz").
const DEV2LAT = {
  'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'n','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'n',
  'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
  'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'w','श':'sh',
  'ष':'sh','स':'s','ह':'h','ज़':'z','फ़':'f','क़':'q','ग़':'g','ड़':'r','ढ़':'rh','य़':'y',
  'अ':'a','आ':'aa','इ':'i','ई':'i','उ':'u','ऊ':'u','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
  'ा':'a','ि':'i','ी':'i','ु':'u','ू':'u','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au',
  'ं':'n','ँ':'n','ः':'','़':'','्':'',
}
function transliterate(s) {
  let out = ''
  for (const ch of s) out += DEV2LAT[ch] !== undefined ? DEV2LAT[ch] : ch
  return out
}
// Consonant skeleton: vowels differ wildly between transliterations
// ("mahafuz" vs "mahfooz"), but consonants stay stable (mhfz === mhfz).
function skeleton(s) {
  return (s || '').toLowerCase().replace(/[^a-z]/g, '').replace(/v/g, 'w').replace(/[aeiou]/g, '')
}

function pickDoctor(doctors, q) {
  if (!doctors.length) return null
  let s = (q || '').toLowerCase().trim()
  if (s) {
    // Transliterate if the name came in Devanagari (e.g. from a Hindi reply).
    if (/[ऀ-ॿ]/.test(s)) s = transliterate(s).toLowerCase()
    const byName = doctors.find(d => d.full_name.toLowerCase().includes(s) || s.includes(d.full_name.toLowerCase()))
    if (byName) return byName
    // Fuzzy: consonant-skeleton match handles spelling variations.
    const sk = skeleton(s)
    if (sk.length >= 2) {
      const bySkeleton = doctors.find(d => {
        const dk = skeleton(d.full_name)
        return dk.includes(sk) || sk.includes(dk)
      })
      if (bySkeleton) return bySkeleton
    }
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

// Make the greeting clearly announce the clinic name FIRST, so a caller can
// tell which clinic they reached even if the rest is spoken quickly. If the
// greeting already starts with the clinic name we leave it; otherwise we
// front-load "<Clinic name>." with a pause before the configured greeting.
function clarifyGreeting(greeting, clinicName) {
  const name = (clinicName || '').trim()
  const g = (greeting || '').trim()
  if (!g) {
    // Default fallback: name first, then offer help — natural pause via comma.
    return name
      ? `नमस्ते, ${name} में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूँ?`
      : `नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?`
  }
  if (!name) return g
  // Already mentions the name near the start? Leave as-is.
  if (g.slice(0, Math.max(40, name.length + 15)).toLowerCase().includes(name.toLowerCase())) return g
  // Otherwise lead with the clinic name + a clear pause.
  return `${name}. ${g}`
}

// Build a per-doctor availability summary for TODAY (in IST), including the
// next few open slots, so the AI can answer "is the doctor free now?" without
// any tool call. Mirrors the slot logic in appointments/slots/route.ts.
async function buildAvailabilityText(doctors) {
  if (!doctors.length) return ''
  // "Now" in India time (server runs in UTC).
  const IST_OFFSET_MIN = 5 * 60 + 30
  const ist = new Date(Date.now() + IST_OFFSET_MIN * 60 * 1000)
  const dayOfWeek = ist.getUTCDay()
  const todayStr = ist.toISOString().slice(0, 10)
  const nowMin = ist.getUTCHours() * 60 + ist.getUTCMinutes()
  const nowHHMM = `${p(Math.floor(nowMin / 60))}:${p(nowMin % 60)}`

  // Fetch today's booked times for all these doctors in one query.
  const ids = doctors.map(d => d.id)
  const { data: booked } = await db
    .from('appointments')
    .select('doctor_id, appointment_time')
    .in('doctor_id', ids)
    .eq('appointment_date', todayStr)
    .not('status', 'in', '("cancelled","no_show")')
  const bookedByDoctor = {}
  for (const b of booked || []) {
    ;(bookedByDoctor[b.doctor_id] ||= new Set()).add((b.appointment_time || '').slice(0, 5))
  }

  const lines = doctors.map(d => {
    const avail = (d.doctor_availability || []).find(a => a.day_of_week === dayOfWeek)
    if (!avail || !avail.is_available) {
      return `- ${d.full_name}: NOT working today (${todayStr}).`
    }
    const [sH, sM] = (avail.start_time || '00:00').split(':').map(Number)
    const [eH, eM] = (avail.end_time || '00:00').split(':').map(Number)
    const startMin = sH * 60 + sM
    const endMin = eH * 60 + eM
    const slotDur = d.slot_duration_minutes || 30
    const minFromNow = nowMin + (d.booking_min_hours || 0) * 60
    const taken = bookedByDoctor[d.id] || new Set()

    const open = []
    for (let m = startMin; m + slotDur <= endMin; m += slotDur) {
      if (m < minFromNow) continue // past or inside the min-notice window
      const t = `${p(Math.floor(m / 60))}:${p(m % 60)}`
      if (taken.has(t)) continue
      open.push(t)
      if (open.length >= 4) break
    }
    const working = `working today ${avail.start_time?.slice(0, 5)}–${avail.end_time?.slice(0, 5)}`
    const openNow = nowMin >= startMin && nowMin < endMin
    if (!open.length) {
      return `- ${d.full_name}: ${working}, but NO more open slots today.`
    }
    return `- ${d.full_name}: ${working}; ${openNow ? 'available now' : 'not in clinic at this moment'}; next open slots today: ${open.join(', ')}.`
  })

  return `Current time (IST): ${nowHHMM}, ${todayStr}.\n${lines.join('\n')}`
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
