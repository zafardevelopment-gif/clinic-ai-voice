/**
 * Provider-agnostic patient notification types.
 *
 * Mirrors src/lib/telephony/types.ts: business logic (reminder dispatch,
 * adherence check-ins) never imports a WhatsApp/SMS SDK directly. It goes
 * through NotificationProvider so a real provider (Gupshup, MSG91, Meta
 * Cloud API, Twilio WhatsApp...) can be swapped in later by only adding an
 * adapter file — no changes to call sites.
 */

export type NotificationChannel = 'voice' | 'whatsapp' | 'sms'

export interface SendMessageArgs {
  /** E.164 phone number. */
  to: string
  /** Fully rendered message text (placeholders already substituted). */
  body: string
  /** Free-form context for logging (reminder_id, follow_up_plan_id, etc). */
  metadata?: Record<string, unknown>
}

export type NotificationDeliveryStatus = 'sent' | 'delivered' | 'failed'

export interface SendMessageResult {
  providerMessageId: string
  status: NotificationDeliveryStatus
  errorMessage?: string
}

export interface NotificationProvider {
  channel: NotificationChannel
  name: string
  send(args: SendMessageArgs): Promise<SendMessageResult>
}
