import type {
  CallInstruction,
  IncomingCallPayload,
  OutboundCallArgs,
  OutboundCallResult,
  TelephonyProvider,
} from './types'

// Exotel webhook IPs — populate from your Exotel dashboard if you want strict
// IP verification. Leave empty to skip IP-check (signature is not supported on
// free-trial plans).
const EXOTEL_ALLOWED_IPS: string[] = []

const EXOTEL_STATUS_MAP: Record<string, 'completed' | 'busy' | 'no_answer' | 'failed'> = {
  completed: 'completed',
  busy: 'busy',
  'no-answer': 'no_answer',
  failed: 'failed',
}

export const exotelAdapter: TelephonyProvider = {
  name: 'exotel',

  async verifyWebhook({ headers }) {
    if (EXOTEL_ALLOWED_IPS.length === 0) return true
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

  async placeOutboundCall(args: OutboundCallArgs): Promise<OutboundCallResult> {
    const apiKey = process.env.EXOTEL_API_KEY
    const apiToken = process.env.EXOTEL_API_TOKEN
    const sid = process.env.EXOTEL_SID
    const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com'
    const defaultFrom = process.env.EXOTEL_OUTBOUND_FROM

    if (!apiKey || !apiToken || !sid) {
      throw new Error('Exotel credentials not configured. Set EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_SID in .env.local')
    }

    const from = args.from || defaultFrom
    if (!from) {
      throw new Error('No caller ID: set EXOTEL_OUTBOUND_FROM or pass args.from')
    }

    // Exotel outbound call API:
    // POST https://<api_key>:<api_token>@<subdomain>/v1/Accounts/<sid>/Calls/connect.json
    const url = `https://${subdomain}/v1/Accounts/${sid}/Calls/connect.json`

    const body = new URLSearchParams({
      From: from,
      To: args.to,
      CallerId: from,
      Url: args.twimlUrl,
      TimeLimit: String((args.timeoutSec ?? 30) * 10),
      ...(args.statusCallbackUrl ? { StatusCallback: args.statusCallbackUrl } : {}),
    })

    const credentials = Buffer.from(`${apiKey}:${apiToken}`).toString('base64')

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Exotel API error ${res.status}: ${text.slice(0, 300)}`)
    }

    const json = await res.json() as { Call?: { Sid?: string; Status?: string } }
    const callSid = json?.Call?.Sid
    if (!callSid) {
      throw new Error(`Exotel did not return a CallSid. Response: ${JSON.stringify(json).slice(0, 300)}`)
    }

    return {
      callSid,
      status: 'initiated',
    }
  },
}

function renderExoml(step: CallInstruction): string {
  switch (step.kind) {
    case 'say':
      return `  <Say voice="alice" language="${escapeAttr(step.language || 'en-IN')}">${escapeText(step.text)}</Say>`
    case 'play':
      return `  <Play>${escapeText(step.url)}</Play>`
    case 'gather':
      return `  <Gather action="${escapeAttr(step.actionUrl)}" method="POST" timeout="${step.timeoutSec || 5}" finishOnKey="#"><Say>${escapeText(step.prompt)}</Say></Gather>`
    case 'connectStream':
      // Requires Voicebot Streaming plan from Exotel.
      return `  <!-- Voicebot Streaming: connect to ${escapeText(step.wsUrl)} -->`
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
