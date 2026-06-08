/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/voice/first-turn
 *
 * Called by Exotel's Gather applet after the caller speaks for the FIRST time.
 * Unlike /api/voice/turn (which needs a pre-existing callId), this endpoint:
 *
 *   1. Identifies the clinic from the dialed number (To).
 *   2. Identifies the caller (From) — creates a patient record if needed.
 *   3. Creates the call record.
 *   4. Runs the first AI turn.
 *   5. Returns ExoML with a Gather pointing to /api/voice/turn?callId=<uuid>
 *      so all subsequent turns use the fast path.
 *
 * Exotel Flow setup:
 *   Incoming → Gather (Say: greeting, Action: /api/voice/first-turn) → [this handler]
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getTelephonyProvider, readFormBody } from '@/lib/telephony'
import { resolveVoice } from '@/lib/telephony/voices'
import { chatCompletion, type LlmMessage } from '@/lib/ai/openrouter'

interface DoctorRow {
  id: string
  full_name: string
  specialization: string | null
  department_id: string | null
  is_active: boolean
  departments: { name: string } | null
}

interface ClinicRow {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  country: string | null
}

/**
 * GET — Exotel Gather dynamic URL calls GET on initial trigger.
 * Convert query params to POST-equivalent and delegate.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const params: Record<string, string> = {}
  q.forEach((v, k) => { params[k] = v })
  return handleFirstTurn(params)
}

export async function POST(req: NextRequest) {
  const { params } = await readFormBody(req)
  return handleFirstTurn(params)
}

async function handleFirstTurn(params: Record<string, string>) {
  const provider = getTelephonyProvider()

  try {
    const incoming = provider.parseIncomingCall(params)

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    ) as any

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // ── 1. Find clinic by dialed number ──────────────────────────────────────
    const dialedNumber = incoming.to
    const numberVariants = buildNumberVariants(dialedNumber)

    let clinic: { id: string; name: string } | null = null

    for (const num of numberVariants) {
      if (clinic) break
      const { data } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('twilio_number', num)
        .eq('is_active', true)
        .single()
      clinic = data ?? null
    }
    for (const num of numberVariants) {
      if (clinic) break
      const { data } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('phone', num)
        .eq('is_active', true)
        .single()
      clinic = data ?? null
    }

    if (!clinic) {
      return xml(
        provider.buildResponse([
          { kind: 'say', text: 'Sorry, this number is not configured. Goodbye.' },
          { kind: 'hangup' },
        ]),
      )
    }

    // ── 2. Load agent config ──────────────────────────────────────────────────
    const { data: agentConfig } = await supabase
      .from('voice_agent_config')
      .select('*')
      .eq('clinic_id', clinic.id)
      .single()

    const voiceProfile = resolveVoice(agentConfig?.voice_type)
    const language = agentConfig?.language || voiceProfile.language
    const voice = voiceProfile.polly
    const rate = agentConfig?.speech_rate || '110%'
    const silenceTimeout = agentConfig?.silence_timeout_sec || 8

    // ── 3. Find or create patient ─────────────────────────────────────────────
    let patient: { id: string; full_name: string } | null = null
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id, full_name')
      .eq('clinic_id', clinic.id)
      .eq('phone', incoming.from)
      .maybeSingle()
    patient = existingPatient ?? null

    // ── 4. Create call record ─────────────────────────────────────────────────
    const { data: call, error: callErr } = await supabase
      .from('calls')
      .insert({
        clinic_id: clinic.id,
        phone_number: incoming.from,
        patient_id: patient?.id || null,
        call_type: 'query',
      })
      .select('id, created_at')
      .single()

    if (callErr || !call) {
      console.error('[first-turn] failed to create call record:', callErr)
      return xml(
        provider.buildResponse([
          {
            kind: 'gather',
            prompt: 'We are having a little trouble right now. Could you say that again?',
            language,
            timeoutSec: silenceTimeout,
            actionUrl: `${APP_URL}/api/voice/first-turn`,
          },
        ]),
      )
    }

    const turnUrl = `${APP_URL}/api/voice/turn?callId=${call.id}`

    // ── 5. Process first speech turn ──────────────────────────────────────────
    const transcript = (params.SpeechResult || '').trim()

    if (!transcript) {
      // Caller was silent — re-prompt using the dynamic greeting
      const greeting =
        agentConfig?.greeting_message || `${clinic.name}. How can I help?`
      return xml(
        provider.buildResponse([
          {
            kind: 'gather',
            prompt: greeting,
            language,
            voice,
            rate,
            timeoutSec: silenceTimeout,
            actionUrl: turnUrl,
          },
        ]),
      )
    }

    // ── 6. Fetch clinic details + doctors for AI context ──────────────────────
    const [{ data: clinicDetails }, { data: doctors }] = await Promise.all([
      supabase
        .from('clinics')
        .select('name, phone, email, address, city, country')
        .eq('id', clinic.id)
        .single(),
      supabase
        .from('doctors')
        .select('id, full_name, specialization, department_id, is_active, departments(name)')
        .eq('clinic_id', clinic.id)
        .eq('is_active', true),
    ])

    const activeDoctors = (doctors || []) as DoctorRow[]
    const clinicName = clinic.name

    // ── 7. LLM reply ──────────────────────────────────────────────────────────
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(
          clinicDetails as ClinicRow | null,
          clinicName,
          patient?.full_name || null,
          agentConfig,
          activeDoctors,
        ),
      },
      { role: 'user', content: transcript },
    ]

    let raw: string
    try {
      const result = await chatCompletion(messages, {
        withFallback: true,
        temperature: 0.3,
        maxTokens: 150,
      })
      raw = result.content?.trim() || ''
    } catch (err) {
      console.error('[first-turn] LLM error:', err)
      raw = 'Sorry, I had a little trouble. Could you say that again?'
    }

    const parsed = parseTags(raw)
    let spoken = parsed.reply
    let endCall = parsed.end

    // Handle booking tag if present on the very first turn (unlikely but possible)
    if (parsed.booking) {
      const { message, booked } = await trySimpleBook({
        supabase,
        callId: call.id,
        clinicId: clinic.id,
        callerPhone: incoming.from,
        patientId: patient?.id || null,
        doctors: activeDoctors,
        booking: parsed.booking,
      })
      spoken = message
      if (booked) endCall = true
    }

    // Persist turn
    const rows: any[] = [{ call_id: call.id, speaker: 'user', message: transcript }]
    if (spoken) rows.push({ call_id: call.id, speaker: 'ai', message: spoken })
    await supabase.from('conversations').insert(rows)

    if (endCall) {
      await finalizeCall(supabase, call.id, call.created_at)
      return xml(
        provider.buildResponse([
          { kind: 'say', text: spoken, language, voice, rate },
          { kind: 'hangup' },
        ]),
      )
    }

    return xml(
      provider.buildResponse([
        {
          kind: 'gather',
          prompt: spoken,
          language,
          voice,
          rate,
          timeoutSec: silenceTimeout,
          actionUrl: turnUrl,
        },
      ]),
    )
  } catch (err) {
    console.error('[first-turn] unexpected error:', err)
    const provider2 = getTelephonyProvider()
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return xml(
      provider2.buildResponse([
        {
          kind: 'gather',
          prompt: 'Sorry, something went wrong. Please say your query again.',
          language: 'en-IN',
          timeoutSec: 8,
          actionUrl: `${APP_URL}/api/voice/first-turn`,
        },
      ]),
    )
  }
}

// ─── Helpers (duplicated from turn/route.ts to keep routes self-contained) ────

function xml(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

function buildNumberVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, '')
  const variants = new Set<string>()
  variants.add(raw)
  variants.add(digits)
  if (digits.length === 10) {
    variants.add('0' + digits)
    variants.add('+91' + digits)
    variants.add('91' + digits)
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    const ten = digits.slice(1)
    variants.add(ten); variants.add('+91' + ten); variants.add('91' + ten)
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const ten = digits.slice(2)
    variants.add(ten); variants.add('0' + ten); variants.add('+91' + ten)
  }
  return Array.from(variants)
}

function buildSystemPrompt(
  clinic: ClinicRow | null,
  clinicName: string,
  patientName: string | null,
  cfg: any,
  doctors: DoctorRow[],
): string {
  const hours =
    cfg?.working_hours_start && cfg?.working_hours_end
      ? `Clinic hours are ${cfg.working_hours_start} to ${cfg.working_hours_end}.`
      : ''
  const caller = patientName ? `The caller is ${patientName}.` : ''
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
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' })
  const doctorList = doctors.length
    ? doctors.map(d => `- ${d.full_name}${d.specialization ? ` (${d.specialization})` : ''}${d.departments?.name ? ` — ${d.departments.name}` : ''}`).join('\n')
    : '(No doctors configured — do NOT promise a specific doctor.)'
  const ak = cfg?.ai_knowledge || {}
  const knowledge = [
    ak.specialties ? `Departments/Specialties: ${ak.specialties}` : '',
    ak.common_symptoms ? `Symptom → Department guide:\n${ak.common_symptoms}` : '',
    ak.faqs ? `Frequently asked questions:\n${ak.faqs}` : '',
  ].filter(Boolean).join('\n\n')
  const customInstructions = (cfg?.booking_rules?.custom_instructions || '').trim()
  const tone = (cfg?.booking_rules?.tone || '').trim()

  return [
    `You are the friendly AI phone receptionist for "${clinicName}".`,
    `You are on a LIVE phone call. Keep replies short (1-2 sentences), warm, natural when spoken.`,
    tone ? `Speak in a ${tone} tone.` : '',
    `Speak in whatever language the caller uses — English, Hindi, Hinglish, Urdu, or any other. Always match the caller's language.`,
    hours, caller,
    `Today is ${weekday}, ${todayStr}. Convert relative dates into exact YYYY-MM-DD.`,
    clinicDetails ? `\nClinic details:\n${clinicDetails}` : '',
    `\nDoctors available:\n${doctorList}`,
    knowledge ? `\nClinic knowledge base:\n${knowledge}` : '',
    customInstructions ? `\nAdditional instructions:\n${customInstructions}` : '',
    `\nNever invent doctors, prices, or availability not given above.`,
    `If it sounds like a medical emergency, tell them to call emergency services immediately.`,
    `\nOUTPUT FORMAT — VERY IMPORTANT:`,
    `Reply in PLAIN TEXT only (no JSON, no markdown).`,
    `To BOOK you need 4 things: patient name, doctor or department, date, time. Ask for missing items one at a time.`,
    `ONLY after you have all 4 AND caller confirms, append: [BOOK: <name> | <doctor or dept> | <YYYY-MM-DD> | <HH:MM 24h>]`,
    `When caller is finished, append [END].`,
  ].filter(Boolean).join('\n')
}

function parseTags(raw: string): { reply: string; booking: any | null; end: boolean } {
  let text = raw.replace(/```[a-z]*\n?/gi, '').trim()
  const end = /\[END\]/i.test(text)
  text = text.replace(/\[END\]/gi, '').trim()
  let booking: any | null = null
  const bookMatch = text.match(/\[BOOK:\s*([^\]]*)\]?/i)
  if (bookMatch) {
    const parts = bookMatch[1].split('|').map((s: string) => s.trim())
    const [name, doctor, date, time] = parts
    if (name) {
      booking = { ready: true, patient_name: name, doctor_name: doctor, department: doctor, appointment_date: date, appointment_time: time }
    }
    text = text.replace(/\[BOOK:[^\]]*\]?/i, '').trim()
  }
  if (text.startsWith('{')) {
    const m = text.match(/"reply"\s*:\s*"([^"]+)"/)
    if (m) text = m[1]
  }
  return { reply: text || 'Sorry, could you please repeat that?', booking, end }
}

async function trySimpleBook(args: {
  supabase: any; callId: string; clinicId: string; callerPhone: string
  patientId: string | null; doctors: DoctorRow[]; booking: any
}): Promise<{ booked: boolean; message: string }> {
  const { supabase, callId, clinicId, callerPhone, doctors, booking } = args
  const name = (booking.patient_name || '').trim()
  const date = (booking.appointment_date || '').trim()
  const time = normalizeTime(booking.appointment_time || '')
  if (!name || !date || !time) {
    return { booked: false, message: 'I need your name, the date, and the time to book. Could you provide those?' }
  }
  const doctor = pickDoctor(doctors, booking.doctor_name, booking.department)
  if (!doctor) {
    return { booked: false, message: 'Our front desk will assign a doctor and confirm your appointment. Is there anything else?' }
  }
  try {
    let patientId = args.patientId
    if (!patientId) {
      const { data: existing } = await supabase.from('patients').select('id').eq('clinic_id', clinicId).eq('phone', callerPhone).maybeSingle()
      if (existing) {
        patientId = existing.id
        await supabase.from('patients').update({ full_name: name }).eq('id', patientId)
      } else {
        const { data: created, error } = await supabase.from('patients').insert({ clinic_id: clinicId, full_name: name, phone: callerPhone }).select('id').single()
        if (error || !created) throw error
        patientId = created.id
      }
      await supabase.from('calls').update({ patient_id: patientId }).eq('id', callId)
    }
    const { error: aErr } = await supabase.from('appointments').insert({
      clinic_id: clinicId, patient_id: patientId, doctor_id: doctor.id,
      appointment_date: date, appointment_time: time, status: 'scheduled', booked_via: 'ai_voice',
    })
    if (aErr) throw aErr
    await supabase.from('calls').update({ outcome: 'booked', call_type: 'booking', intent: 'book_appointment' }).eq('id', callId)
    return { booked: true, message: `Done! Your appointment with ${doctor.full_name} is booked for ${date} at ${time.slice(0, 5)}. Thank you for calling!` }
  } catch (err) {
    console.error('[first-turn] booking failed:', err)
    return { booked: false, message: 'Our front desk will call you back to confirm your appointment. Is there anything else?' }
  }
}

function pickDoctor(doctors: DoctorRow[], doctorName?: string, department?: string): DoctorRow | null {
  if (!doctors.length) return null
  const dn = (doctorName || '').toLowerCase().trim()
  const dep = (department || '').toLowerCase().trim()
  if (dn) {
    const byName = doctors.find(d => d.full_name.toLowerCase().includes(dn) || dn.includes(d.full_name.toLowerCase()))
    if (byName) return byName
  }
  if (dep) {
    const byDept = doctors.find(d => (d.departments?.name || '').toLowerCase().includes(dep) || (d.specialization || '').toLowerCase().includes(dep))
    if (byDept) return byDept
  }
  return doctors[0]
}

function normalizeTime(t: string): string {
  const s = t.trim().toLowerCase()
  if (!s) return ''
  const ampm = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/)
  if (ampm) {
    let h = parseInt(ampm[1], 10)
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0
    if (ampm[3] === 'pm' && h < 12) h += 12
    if (ampm[3] === 'am' && h === 12) h = 0
    return `${pad(h)}:${pad(m)}:00`
  }
  const hm = s.match(/^(\d{1,2}):(\d{2})/)
  if (hm) return `${pad(parseInt(hm[1], 10))}:${pad(parseInt(hm[2], 10))}:00`
  const hOnly = s.match(/^(\d{1,2})$/)
  if (hOnly) return `${pad(parseInt(hOnly[1], 10))}:00:00`
  return ''
}

function pad(n: number): string { return n.toString().padStart(2, '0') }

async function finalizeCall(supabase: any, callId: string, startedAt: string) {
  const duration = startedAt ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)) : null
  const { data: existing } = await supabase.from('calls').select('outcome').eq('id', callId).single()
  const updates: Record<string, unknown> = {}
  if (duration !== null) updates.duration_seconds = duration
  if (!existing?.outcome) updates.outcome = 'not_booked'
  if (Object.keys(updates).length) await supabase.from('calls').update(updates).eq('id', callId)
}
