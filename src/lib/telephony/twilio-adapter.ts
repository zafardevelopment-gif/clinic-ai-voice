import twilio from 'twilio'
import type {
  CallInstruction,
  CallStatusPayload,
  IncomingCallPayload,
  OutboundCallArgs,
  OutboundCallResult,
  TelephonyProvider,
} from './types'

const { VoiceResponse } = twilio.twiml

let cachedTwilioClient: ReturnType<typeof twilio> | null = null

function getClient() {
  if (cachedTwilioClient) return cachedTwilioClient
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set to place outbound calls')
  }
  cachedTwilioClient = twilio(sid, token)
  return cachedTwilioClient
}

const TWILIO_STATUS_MAP: Record<string, CallStatusPayload['status']> = {
  initiated: 'initiated',
  ringing: 'ringing',
  'in-progress': 'in_progress',
  completed: 'completed',
  failed: 'failed',
  busy: 'busy',
  'no-answer': 'no_answer',
  canceled: 'cancelled',
}

export const twilioAdapter: TelephonyProvider = {
  name: 'twilio',

  async verifyWebhook({ url, headers, formParams }) {
    const authToken = process.env.TWILIO_AUTH_TOKEN
    if (!authToken) return false
    const signature = headers.get('x-twilio-signature') || ''
    if (!signature) return false
    return twilio.validateRequest(authToken, signature, url, formParams)
  },

  parseIncomingCall(formParams) {
    return {
      callSid: formParams.CallSid,
      to: formParams.To,
      from: formParams.From,
      provider: 'twilio',
      raw: formParams,
    } satisfies IncomingCallPayload
  },

  parseCallStatus(formParams) {
    const raw = formParams.CallStatus
    const status = TWILIO_STATUS_MAP[raw] || 'failed'
    const durationStr = formParams.CallDuration
    return {
      callSid: formParams.CallSid,
      status,
      durationSec: durationStr ? parseInt(durationStr, 10) : undefined,
      provider: 'twilio',
      raw: formParams,
    }
  },

  buildResponse(instructions) {
    const vr = new VoiceResponse()
    for (const step of instructions) {
      applyInstruction(vr, step)
    }
    return vr.toString()
  },

  async placeOutboundCall(args: OutboundCallArgs): Promise<OutboundCallResult> {
    const client = getClient()
    const call = await client.calls.create({
      to: args.to,
      from: args.from,
      url: args.twimlUrl,
      method: 'POST',
      statusCallback: args.statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      timeout: args.timeoutSec ?? 30,
      // Human/machine detection. When true, Twilio passes AnsweredBy=human|machine
      // to our TwiML URL so we can avoid speaking a reminder into voicemail.
      machineDetection: args.machineDetection ? 'Enable' : undefined,
    })
    return {
      callSid: call.sid,
      status: (TWILIO_STATUS_MAP[call.status] || 'initiated') as OutboundCallResult['status'],
    }
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyInstruction(vr: any, step: CallInstruction) {
  switch (step.kind) {
    case 'say': {
      const say = vr.say({
        language: step.language || 'en-IN',
        voice: step.voice || 'Polly.Aditi',
      })
      speak(say, step.text, step.rate)
      return
    }
    case 'play':
      vr.play(step.url)
      return
    case 'gather': {
      const gather = vr.gather({
        input: ['speech'],
        language: step.language || 'en-IN',
        // 'auto' lets Twilio detect end-of-speech instead of waiting the full
        // timeout — far more reliable for conversational replies like "haan".
        speechTimeout: 'auto',
        timeout: step.timeoutSec || 5,
        speechModel: 'phone_call',
        // Hit the action URL even when the caller stays silent, so we can
        // re-prompt instead of Twilio silently hanging up the call.
        actionOnEmptyResult: true,
        action: step.actionUrl,
        method: 'POST',
      })
      const say = gather.say({
        language: step.language || 'en-IN',
        voice: step.voice || 'Polly.Aditi',
      })
      speak(say, step.prompt, step.rate)
      return
    }
    case 'connectStream': {
      const connect = vr.connect()
      const stream = connect.stream({ url: step.wsUrl })
      if (step.metadata) {
        for (const [key, value] of Object.entries(step.metadata)) {
          stream.parameter({ name: key, value })
        }
      }
      return
    }
    case 'dial':
      vr.dial(step.number)
      return
    case 'hangup':
      vr.hangup()
      return
  }
}

/**
 * Speak `text` inside a <Say>. When `rate` is given (e.g. '110%'), wrap the
 * words in SSML <prosody rate="..."> so Polly speaks faster/slower. Without a
 * rate we add the text plainly (Twilio escapes it for us).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function speak(say: any, text: string, rate?: string) {
  if (rate) {
    say.prosody({ rate }, text)
  } else {
    say.addText(text)
  }
}
