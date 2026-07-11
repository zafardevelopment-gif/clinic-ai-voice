import { createConsoleProvider } from './console-provider'
import { createVoiceAdapter } from './voice-adapter'
import type { NotificationChannel, NotificationProvider } from './types'

export * from './types'

/**
 * Returns the active provider for a channel. Defaults to the console/log
 * stub for whatsapp/sms until WHATSAPP_PROVIDER / SMS_PROVIDER env vars
 * point at a real integration (add an adapter file + register it here when
 * that happens — no call-site changes needed).
 */
export function getNotificationProvider(channel: NotificationChannel): NotificationProvider {
  if (channel === 'voice') return createVoiceAdapter()

  const envVar = channel === 'whatsapp' ? 'WHATSAPP_PROVIDER' : 'SMS_PROVIDER'
  const configured = process.env[envVar]

  // No real provider configured yet → console stub. When a real provider is
  // added, branch here: if (configured === 'gupshup') return createGupshupProvider()
  if (!configured || configured === 'console') {
    return createConsoleProvider(channel)
  }

  throw new Error(`Unknown ${channel} provider "${configured}" — no adapter registered yet.`)
}
