import { getTelephonyProvider } from '@/lib/telephony'
import type { NotificationProvider, SendMessageArgs, SendMessageResult } from './types'

/**
 * Wraps the existing TelephonyProvider so voice can be selected through the
 * same getNotificationProvider('voice') call site as WhatsApp/SMS.
 *
 * Note: voice reminders in this app are placed via placeReminderCall()
 * (src/lib/reminders/place-call.ts), which already owns the full
 * script-generation + TwiML flow. This adapter exists for interface
 * symmetry and any future direct-dial notification uses; the cron
 * dispatcher continues to call placeReminderCall() directly for voice.
 */
export function createVoiceAdapter(): NotificationProvider {
  return {
    channel: 'voice',
    name: getTelephonyProvider().name,
    async send(args: SendMessageArgs): Promise<SendMessageResult> {
      throw new Error(
        'Voice notifications go through placeReminderCall(), not NotificationProvider.send(). ' +
        `Blocked call for ${args.to}.`,
      )
    },
  }
}
