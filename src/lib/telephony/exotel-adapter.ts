import type {
  CallInstruction,
  IncomingCallPayload,
  OutboundCallArgs,
  OutboundCallResult,
  TelephonyProvider,
} from './types'

// Exotel-allowlisted IPs. Populate from your Exotel account dashboard
// before flipping the provider to 'exotel' in production.
const EXOTEL_ALLOWED_IPS: string[] = []

const EXOTEL_STATUS_MAP: Record<string, 'completed' | 'busy' | 'no_answer' | 'failed'> = {
  completed: 'completed',
  busy: 'busy',
  'no-answer': 'no_answer',
  failed: 'failed',
}

/**
 * Exotel adapter — scaffolded for India production.
 *
 * Status: NOT WIRED YET. Activate when:
 *   1. Exotel account is approved (KYC done)
 *   2. ExoML applet is configured to POST webhooks to /api/voice/incoming-call
 *   3. (For real-time AI) Voicebot Streaming plan is enabled — required for
 *      bidirectional WebSocket audio, equivalent to Twilio Media Streams.
 *
 * Without Voicebot Streaming, in-call AI conversation is not possible —
 * only IVR-style menus + before/after-call AI logic.
 */
export const exotelAdapter: TelephonyProvider = {
  name: 'exotel',

  async verifyWebhook({ headers }) {
    if (EXOTEL_ALLOWED_IPS.length === 0) return false
    const forwarded = headers.get('x-forwarded-for') || ''
    const clientIp = forwarded.split(',')[0]?.trim() || headers.get('x-real-ip') || ''
    return EXOTEL_ALLOWED_IPS.includes(clientIp)
  },

  parseIncomingCall(formParams) {
    return {
      callSid: formParams.CallSid,
      to: formParams.To,
      from: formParams.From,
      provider: 'exotel',
      raw: formParams,
    } satisfies IncomingCallPayload
  },

  parseCallStatus(formParams) {
    const raw = formParams.CallStatus || formParams.Status || ''
    const status = EXOTEL_STATUS_MAP[raw.toLowerCase()] || 'failed'
    const durationStr = formParams.ConversationDuration || formParams.DialCallDuration
    return {
      callSid: formParams.CallSid,
      status,
      durationSec: durationStr ? parseInt(durationStr, 10) : undefined,
      provider: 'exotel',
      raw: formParams,
    }
  },

  buildResponse(instructions) {
    const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>']
    for (const step of instructions) {
      lines.push(renderExoml(step))
    }
    lines.push('</Response>')
    return lines.join('\n')
  },

  async placeOutboundCall(_args: OutboundCallArgs): Promise<OutboundCallResult> {
    // Exotel outbound: POST https://<subdomain>/v1/Accounts/<sid>/Calls/connect.json
    // with From, To, Url (CallerId must be a verified Exotel ExoPhone).
    // Wire this up once your KYC + DLT template is approved.
    throw new Error('Exotel outbound calls not yet implemented. Use Twilio for dev/testing or finish the adapter once Exotel onboarding completes.')
  },
}

function renderExoml(step: CallInstruction): string {
  switch (step.kind) {
    case 'say':
      // Exotel only supports pre-uploaded audio for custom voice. <Say> works
      // for basic TTS but with limited voices/languages.
      return `  <Say voice="alice" language="${escapeAttr(step.language || 'en-IN')}">${escapeText(step.text)}</Say>`
    case 'play':
      return `  <Play>${escapeText(step.url)}</Play>`
    case 'gather':
      return `  <Gather action="${escapeAttr(step.actionUrl)}" method="POST" timeout="${step.timeoutSec || 5}" finishOnKey="#"><Say>${escapeText(step.prompt)}</Say></Gather>`
    case 'connectStream':
      // Requires Voicebot Streaming plan. Tag name confirmed at Exotel onboarding.
      return `  <!-- TODO: Voicebot Streaming connect to ${escapeText(step.wsUrl)} -->`
    case 'dial':
      return `  <Dial>${escapeText(step.number)}</Dial>`
    case 'hangup':
      return `  <Hangup/>`
  }
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;')
}
