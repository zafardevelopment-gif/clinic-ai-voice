import type { NotificationChannel, NotificationProvider, SendMessageArgs, SendMessageResult } from './types'

/**
 * Dev/demo provider: logs the message and reports it as delivered.
 *
 * This is the default for WhatsApp and SMS until real credentials
 * (Gupshup/MSG91/Meta Cloud API/etc.) are configured via WHATSAPP_PROVIDER /
 * SMS_PROVIDER env vars. It lets every code path (templates, DB status
 * tracking, reminder_events, dashboards) work end-to-end today.
 */
export function createConsoleProvider(channel: NotificationChannel): NotificationProvider {
  return {
    channel,
    name: 'console',
    async send(args: SendMessageArgs): Promise<SendMessageResult> {
      const id = `console_${channel}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      console.log(`[notify:${channel}:console] → ${args.to}\n${args.body}`, args.metadata ?? {})
      return { providerMessageId: id, status: 'delivered' }
    },
  }
}
