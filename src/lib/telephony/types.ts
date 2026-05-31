/**
 * Provider-agnostic telephony types.
 *
 * Goal: business logic (route handlers, voice agent) never imports a provider
 * SDK directly. They go through the TelephonyProvider interface so we can
 * swap Twilio (dev/testing) for Exotel (production India) by only changing
 * the adapter, not the routes.
 */

export type TelephonyProviderName = 'twilio' | 'exotel'

export interface IncomingCallPayload {
  /** Stable per-call ID from provider (Twilio CallSid, Exotel CallSid). */
  callSid: string
  /** Number that was dialed (clinic's DID). E.164 preferred. */
  to: string
  /** Caller's number. E.164 preferred. */
  from: string
  /** Provider name that produced this payload. */
  provider: TelephonyProviderName
  /** Raw provider params for debugging / future provider-specific fields. */
  raw: Record<string, string>
}

export type TerminalCallStatus =
  | 'completed'
  | 'failed'
  | 'busy'
  | 'no_answer'
  | 'cancelled'

export type CallStatus =
  | 'initiated'
  | 'ringing'
  | 'in_progress'
  | TerminalCallStatus

export interface CallStatusPayload {
  callSid: string
  status: CallStatus
  durationSec?: number
  provider: TelephonyProviderName
  raw: Record<string, string>
}

/**
 * Instructions for the provider on how to handle the call.
 * The adapter translates this into provider-specific XML (TwiML / ExoML).
 */
export type CallInstruction =
  // `rate` is an optional speaking speed (SSML prosody rate, e.g. '110%').
  | { kind: 'say'; text: string; language?: string; voice?: string; rate?: string }
  | { kind: 'play'; url: string }
  | { kind: 'gather'; prompt: string; language?: string; timeoutSec?: number; actionUrl: string; voice?: string; rate?: string }
  | { kind: 'connectStream'; wsUrl: string; metadata?: Record<string, string> }
  | { kind: 'dial'; number: string }
  | { kind: 'hangup'; reason?: string }

/**
 * Args for placing an outbound call (ClinicPing reminder calls).
 *
 * The provider initiates the call to `to`. When the callee answers, the
 * provider fetches TwiML/ExoML from `twimlUrl` to decide what to say.
 * Lifecycle status callbacks go to `statusCallbackUrl`.
 */
export interface OutboundCallArgs {
  /** E.164 number to dial (e.g. +9198xxxxxxxx). */
  to: string
  /** Verified caller ID owned by the clinic / app on this provider. */
  from: string
  /** Public URL the carrier hits when the call connects, returns XML. */
  twimlUrl: string
  /** Public URL for ringing/answered/completed lifecycle webhooks. */
  statusCallbackUrl?: string
  /** Seconds to ring before giving up. Default 30. */
  timeoutSec?: number
  /** Detect answering-machine vs human (Twilio AMD). Default false. */
  machineDetection?: boolean
}

export interface OutboundCallResult {
  /** Carrier-side unique call ID. Store as appointment_reminders.provider_call_sid. */
  callSid: string
  /** Initial state reported by the carrier. */
  status: CallStatus
}

export interface TelephonyProvider {
  name: TelephonyProviderName

  /**
   * Validate that an inbound webhook actually came from the provider.
   * Twilio: HMAC signature header. Exotel: IP whitelist + optional basic auth.
   */
  verifyWebhook(args: {
    url: string
    headers: Headers
    rawBody: string
    formParams: Record<string, string>
  }): Promise<boolean>

  /** Parse provider-specific webhook form data into a normalized payload. */
  parseIncomingCall(formParams: Record<string, string>): IncomingCallPayload

  /** Parse provider-specific status webhook form data. */
  parseCallStatus(formParams: Record<string, string>): CallStatusPayload

  /**
   * Build the XML response (TwiML / ExoML) that tells the provider what to do.
   * Routes return this string with Content-Type: text/xml.
   */
  buildResponse(instructions: CallInstruction[]): string

  /**
   * Place an outbound call. Used by the reminder scheduler.
   *
   * Implementation note: when this returns, the call is *queued/initiated* —
   * not answered. The actual conversation flow happens via the twimlUrl
   * callback once the callee picks up.
   */
  placeOutboundCall(args: OutboundCallArgs): Promise<OutboundCallResult>
}
