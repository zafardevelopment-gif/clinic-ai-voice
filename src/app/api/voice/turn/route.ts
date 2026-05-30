/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  getTelephonyProvider,
  readFormBody,
} from '@/lib/telephony'
import { resolveVoice } from '@/lib/telephony/voices'
import { chatCompletion, parseJsonResponse, type LlmMessage } from '@/lib/ai/openrouter'

interface DoctorRow {
  id: string
  full_name: string
  specialization: string | null
  department_id: string | null
  is_active: boolean
  departments: { name: string } | null
}

interface BookingPayload {
  ready?: boolean
  patient_name?: string
  doctor_name?: string
  department?: string
  appointment_date?: string // YYYY-MM-DD
  appointment_time?: string // HH:MM (24h)
  reason?: string
}

interface TurnResult {
  reply: string
  booking?: BookingPayload
  end_call?: boolean
}

/**
 * POST /api/voice/turn?callId=<uuid>
 *
 * The conversational loop for <Gather>-mode voice calls.
 *
 * Twilio plays the greeting (from /api/voice/incoming-call) inside a <Gather>
 * whose `action` points here. When the caller speaks, Twilio POSTs the
 * speech-to-text result (SpeechResult) to this route. We:
 *
 *   1. Read the caller's transcript.
 *   2. Load clinic + recent conversation history for context.
 *   3. Ask the LLM (acting as the clinic receptionist) for a reply.
 *   4. Persist both turns to the conversations table.
 *   5. Return TwiML that SAYS the reply and opens another <Gather> so the
 *      conversation continues — until the caller hangs up or goes silent.
 */

const MAX_TURNS = 12 // safety cap so a call can't loop forever

export async function POST(req: NextRequest) {
  const provider = getTelephonyProvider()
  const callId = req.nextUrl.searchParams.get('callId') || ''
  const turnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/voice/turn?callId=${callId}`

  // Any unexpected error must NOT 500 — that makes Twilio hang up the call.
  // Instead, re-prompt so the conversation can recover.
  try {
    return await handleTurn(req, provider, callId)
  } catch (err) {
    console.error('[voice/turn] unexpected error, re-prompting:', err)
    return xml(
      provider.buildResponse([
        {
          kind: 'gather',
          prompt: 'Sorry, could you please say that again?',
          language: 'en-IN',
          timeoutSec: 5,
          actionUrl: turnUrl,
        },
      ]),
    )
  }
}

async function handleTurn(
  req: NextRequest,
  provider: ReturnType<typeof getTelephonyProvider>,
  callId: string,
) {
  const { rawBody, params } = await readFormBody(req)

  // Verify the request really came from Twilio (production only).
  const webhookUrl =
    (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') +
    `/api/voice/turn?callId=${callId}`
  const verified = await provider.verifyWebhook({
    url: webhookUrl,
    headers: req.headers,
    rawBody,
    formParams: params,
  })
  if (!verified && process.env.NODE_ENV === 'production') {
    return xml(
      provider.buildResponse([
        { kind: 'say', text: 'Sorry, we could not verify this call.' },
        { kind: 'hangup' },
      ]),
      401,
    )
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  if (!callId) {
    return xml(
      provider.buildResponse([
        { kind: 'say', text: 'Sorry, something went wrong. Goodbye.' },
        { kind: 'hangup' },
      ]),
    )
  }

  // Load the call → clinic → voice config.
  const { data: call } = await supabase
    .from('calls')
    .select('id, clinic_id, phone_number, patient_id, created_at, clinics(name), patients(full_name)')
    .eq('id', callId)
    .single()

  if (!call) {
    return xml(
      provider.buildResponse([
        { kind: 'say', text: 'Sorry, this call could not be found. Goodbye.' },
        { kind: 'hangup' },
      ]),
    )
  }

  const { data: agentConfig } = await supabase
    .from('voice_agent_config')
    .select('*')
    .eq('clinic_id', call.clinic_id)
    .single()

  // Load this clinic's active doctors (with department) so the AI can match a
  // real doctor and we can actually create the appointment.
  const { data: doctors } = await supabase
    .from('doctors')
    .select('id, full_name, specialization, department_id, is_active, departments(name)')
    .eq('clinic_id', call.clinic_id)
    .eq('is_active', true)

  const activeDoctors = (doctors || []) as DoctorRow[]

  const voiceProfile = resolveVoice(agentConfig?.voice_type)
  const language = agentConfig?.language || voiceProfile.language
  const voice = voiceProfile.polly
  const clinicName = (call.clinics as { name: string } | null)?.name || 'the clinic'
  const patientName =
    (call.patients as { full_name: string } | null)?.full_name || null

  const transcript = (params.SpeechResult || '').trim()
  const turnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/voice/turn?callId=${callId}`

  // Caller stayed silent → re-prompt once, then they can speak again.
  if (!transcript) {
    return xml(
      provider.buildResponse([
        {
          kind: 'gather',
          prompt: 'Sorry, I did not catch that. Could you please say it again?',
          language,
          voice,
          timeoutSec: agentConfig?.silence_timeout_sec || 5,
          actionUrl: turnUrl,
        },
      ]),
    )
  }

  // Load existing conversation history for context (oldest first).
  const { data: history } = await supabase
    .from('conversations')
    .select('speaker, message')
    .eq('call_id', callId)
    .order('timestamp', { ascending: true })

  const turnsSoFar = (history?.length || 0) / 2
  if (turnsSoFar >= MAX_TURNS) {
    await saveTurns(supabase, callId, transcript, null)
    await finalizeCall(supabase, callId, call.created_at)
    return xml(
      provider.buildResponse([
        {
          kind: 'say',
          text: 'Thank you for calling. Our team will follow up with you shortly. Goodbye.',
          language,
          voice,
        },
        { kind: 'hangup' },
      ]),
    )
  }

  // Build the LLM conversation.
  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt(clinicName, patientName, agentConfig, activeDoctors) },
  ]
  for (const h of history || []) {
    messages.push({
      role: h.speaker === 'ai' ? 'assistant' : 'user',
      content: h.message,
    })
  }
  messages.push({ role: 'user', content: transcript })

  // The model returns a small JSON object so we can both speak a reply AND
  // take real actions (create the appointment) on the same turn.
  let turn: TurnResult
  try {
    const result = await chatCompletion(messages, {
      withFallback: true,
      temperature: 0.3,
      maxTokens: 200,
    })
    turn = parseTurn(result.content)
  } catch (err) {
    console.error('[voice/turn] LLM failed:', err)
    turn = {
      reply: 'I am having a little trouble right now. Could you please say that again?',
      end_call: false,
    }
  }

  let spoken = turn.reply?.trim() || 'Sorry, could you please repeat that?'
  let endCall = !!turn.end_call

  // If the model says the booking details are complete, actually create the
  // appointment now and replace the spoken reply with a real confirmation.
  if (turn.booking?.ready) {
    const result = await tryBook({
      supabase,
      callId,
      clinicId: call.clinic_id,
      callerPhone: call.phone_number,
      existingPatientId: call.patient_id,
      doctors: activeDoctors,
      booking: turn.booking,
      language,
    })
    spoken = result.message
    if (result.booked) endCall = true
  }

  // Persist both turns (use the actual spoken reply).
  await saveTurns(supabase, callId, transcript, spoken)

  if (endCall) {
    await finalizeCall(supabase, callId, call.created_at)
    return xml(
      provider.buildResponse([
        { kind: 'say', text: spoken, language, voice },
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
        timeoutSec: agentConfig?.silence_timeout_sec || 5,
        actionUrl: turnUrl,
      },
    ]),
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function xml(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

async function saveTurns(
  supabase: any,
  callId: string,
  userMsg: string,
  aiMsg: string | null,
) {
  const rows: Array<{ call_id: string; speaker: string; message: string }> = [
    { call_id: callId, speaker: 'user', message: userMsg },
  ]
  if (aiMsg) rows.push({ call_id: callId, speaker: 'ai', message: aiMsg })
  const { error } = await supabase.from('conversations').insert(rows)
  if (error) console.error('[voice/turn] failed to save conversation:', error)
}

function systemPrompt(
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

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' })

  const doctorList = doctors.length
    ? doctors
        .map(
          d =>
            `- ${d.full_name}${d.specialization ? ` (${d.specialization})` : ''}${
              d.departments?.name ? ` — ${d.departments.name}` : ''
            }`,
        )
        .join('\n')
    : '(No doctors are configured yet — do NOT promise a specific doctor; tell the caller the front desk will confirm.)'

  // Clinic-provided knowledge base (from the AI Setup page) so the agent can
  // answer real questions and route symptoms to the right department.
  const ak = cfg?.ai_knowledge || {}
  const knowledge = [
    ak.specialties ? `Departments/Specialties: ${ak.specialties}` : '',
    ak.common_symptoms ? `Symptom → Department guide:\n${ak.common_symptoms}` : '',
    ak.faqs ? `Frequently asked questions (use these to answer):\n${ak.faqs}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const customInstructions = (cfg?.booking_rules?.custom_instructions || '').trim()
  const tone = (cfg?.booking_rules?.tone || '').trim()

  return [
    `You are the friendly AI phone receptionist for "${clinicName}".`,
    `You are on a LIVE phone call. Keep replies short (1-2 sentences), warm, natural when spoken.`,
    tone ? `Speak in a ${tone} tone.` : '',
    `You may speak English, Hindi, or Hinglish to match the caller.`,
    hours,
    caller,
    `Today is ${weekday}, ${todayStr}. Convert relative dates ("kal", "tomorrow", "Monday") into an exact YYYY-MM-DD date.`,
    ``,
    `Doctors available at this clinic:`,
    doctorList,
    knowledge ? `\nClinic knowledge base:\n${knowledge}` : '',
    customInstructions ? `\nAdditional instructions from the clinic:\n${customInstructions}` : '',
    ``,
    `BOOKING FLOW: To book an appointment you need 4 things — patient name, a doctor or department from the list above, a date, and a time. Ask for whatever is missing, one thing at a time. When you have all four AND the caller has confirmed, set booking.ready=true.`,
    `Never invent doctors, prices, or availability not given above.`,
    `If it sounds like a medical emergency, tell them to call emergency services immediately and set end_call=true.`,
    ``,
    `ALWAYS respond with ONLY a JSON object (no prose, no markdown) in this exact shape:`,
    `{"reply": "<what to say to the caller>", "booking": {"ready": false, "patient_name": "", "doctor_name": "", "department": "", "appointment_date": "", "appointment_time": "", "reason": ""}, "end_call": false}`,
    `Rules: "reply" is required. Include "booking" only when the caller wants an appointment; set ready=true only when all details are gathered and confirmed. Set end_call=true when the caller is done and has nothing else.`,
  ]
    .filter(Boolean)
    .join('\n')
}

// Parse the model's JSON turn. Falls back gracefully if it returns plain text.
function parseTurn(content: string): TurnResult {
  const raw = (content || '').trim()
  try {
    const obj = parseJsonResponse<TurnResult>(raw)
    if (obj && typeof obj.reply === 'string') return obj
  } catch {
    // Not JSON — try to salvage an embedded object, else treat as plain reply.
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        const obj = JSON.parse(match[0]) as TurnResult
        if (obj && typeof obj.reply === 'string') return obj
      } catch {
        /* fall through */
      }
    }
  }
  return { reply: raw || 'Sorry, could you please repeat that?', end_call: false }
}

// Attempt to create the appointment. Returns a spoken message and whether it
// succeeded. Never throws — booking problems become a spoken fallback.
async function tryBook(args: {
  supabase: any
  callId: string
  clinicId: string
  callerPhone: string
  existingPatientId: string | null
  doctors: DoctorRow[]
  booking: BookingPayload
  language: string
}): Promise<{ booked: boolean; message: string }> {
  const { supabase, callId, clinicId, callerPhone, existingPatientId, doctors, booking } = args

  const name = (booking.patient_name || '').trim()
  const date = (booking.appointment_date || '').trim()
  const time = normalizeTime(booking.appointment_time || '')

  if (!name || !date || !time) {
    return {
      booked: false,
      message:
        'I just need a few more details to book that. Could you tell me your name, the date, and the time you prefer?',
    }
  }

  // Match a doctor by name first, then by department, else first available.
  const doctor = pickDoctor(doctors, booking.doctor_name, booking.department)
  if (!doctor) {
    return {
      booked: false,
      message:
        'I have noted your request. Our front desk will assign a doctor and call you back to confirm. Is there anything else?',
    }
  }

  try {
    // Find or create the patient (keyed by caller's phone number).
    let patientId = existingPatientId
    if (!patientId) {
      const { data: existing } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('phone', callerPhone)
        .maybeSingle()
      if (existing) {
        patientId = existing.id
        await supabase.from('patients').update({ full_name: name }).eq('id', patientId)
      } else {
        const { data: created, error: pErr } = await supabase
          .from('patients')
          .insert({ clinic_id: clinicId, full_name: name, phone: callerPhone })
          .select('id')
          .single()
        if (pErr || !created) throw pErr || new Error('patient insert failed')
        patientId = created.id
      }
      await supabase.from('calls').update({ patient_id: patientId }).eq('id', callId)
    }

    const { error: aErr } = await supabase.from('appointments').insert({
      clinic_id: clinicId,
      patient_id: patientId,
      doctor_id: doctor.id,
      department_id: doctor.department_id,
      appointment_date: date,
      appointment_time: time,
      status: 'scheduled',
      reason: booking.reason || null,
      booked_via: 'ai_voice',
    })
    if (aErr) throw aErr

    await supabase
      .from('calls')
      .update({ outcome: 'booked', call_type: 'booking', intent: 'book_appointment' })
      .eq('id', callId)

    const spokenTime = time.slice(0, 5)
    return {
      booked: true,
      message: `Done! I've booked your appointment with ${doctor.full_name} on ${date} at ${spokenTime}. You'll get a confirmation message shortly. Thank you for calling!`,
    }
  } catch (err) {
    console.error('[voice/turn] booking failed:', err)
    return {
      booked: false,
      message:
        'I had trouble saving that just now. Our front desk will call you back to confirm your appointment. Is there anything else?',
    }
  }
}

function pickDoctor(
  doctors: DoctorRow[],
  doctorName?: string,
  department?: string,
): DoctorRow | null {
  if (!doctors.length) return null
  const dn = (doctorName || '').toLowerCase().trim()
  const dep = (department || '').toLowerCase().trim()

  if (dn) {
    const byName = doctors.find(d => d.full_name.toLowerCase().includes(dn) || dn.includes(d.full_name.toLowerCase()))
    if (byName) return byName
  }
  if (dep) {
    const byDept = doctors.find(
      d =>
        (d.departments?.name || '').toLowerCase().includes(dep) ||
        (d.specialization || '').toLowerCase().includes(dep),
    )
    if (byDept) return byDept
  }
  return doctors[0]
}

// Twilio/STT may give "10", "10 am", "14:30" etc. Normalize to HH:MM:SS.
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

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

// Save call duration + a default outcome when the call ends.
async function finalizeCall(supabase: any, callId: string, startedAt: string) {
  const duration = startedAt
    ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
    : null
  const { data: existing } = await supabase
    .from('calls')
    .select('outcome')
    .eq('id', callId)
    .single()
  const updates: Record<string, unknown> = {}
  if (duration !== null) updates.duration_seconds = duration
  if (!existing?.outcome) updates.outcome = 'not_booked'
  if (Object.keys(updates).length) {
    await supabase.from('calls').update(updates).eq('id', callId)
  }
}
