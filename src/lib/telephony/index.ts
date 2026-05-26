import { exotelAdapter } from './exotel-adapter'
import { twilioAdapter } from './twilio-adapter'
import type { TelephonyProvider, TelephonyProviderName } from './types'

export * from './types'

const PROVIDERS: Record<TelephonyProviderName, TelephonyProvider> = {
  twilio: twilioAdapter,
  exotel: exotelAdapter,
}

/**
 * Returns the active provider. Defaults to Twilio (dev/testing).
 * Switch to Exotel in production by setting TELEPHONY_PROVIDER=exotel.
 */
export function getTelephonyProvider(
  override?: TelephonyProviderName,
): TelephonyProvider {
  const name =
    override ||
    (process.env.TELEPHONY_PROVIDER as TelephonyProviderName | undefined) ||
    'twilio'
  const provider = PROVIDERS[name]
  if (!provider) {
    throw new Error(`Unknown telephony provider: ${name}`)
  }
  return provider
}

/** Helper: read raw body + parse form-urlencoded params from a NextRequest. */
export async function readFormBody(req: Request): Promise<{
  rawBody: string
  params: Record<string, string>
}> {
  const rawBody = await req.text()
  const searchParams = new URLSearchParams(rawBody)
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return { rawBody, params }
}
