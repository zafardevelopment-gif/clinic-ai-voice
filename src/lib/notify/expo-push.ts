/**
 * Minimal Expo push notification sender — no SDK dependency, just a
 * fetch() against Expo's push API (https://docs.expo.dev/push-notifications/sending-notifications/).
 * Used for patient-app dose reminders and (Phase 2) family missed-dose alerts.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface ExpoPushResult {
  ok: boolean
  error?: string
}

export async function sendExpoPush(message: ExpoPushMessage): Promise<ExpoPushResult> {
  if (!message.to.startsWith('ExponentPushToken')) {
    return { ok: false, error: 'invalid_push_token' }
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: message.to,
        title: message.title,
        body: message.body,
        data: message.data || {},
        sound: 'default',
      }),
    })
    if (!res.ok) return { ok: false, error: `expo_push_http_${res.status}` }

    const json = await res.json()
    const status = json?.data?.status
    if (status === 'error') return { ok: false, error: json?.data?.message || 'expo_push_error' }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'expo_push_network_error' }
  }
}
