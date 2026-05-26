/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getTelephonyProvider, readFormBody } from '@/lib/telephony'

/**
 * POST /api/webhooks/twilio/status
 *
 * Call lifecycle webhook. Twilio (or Exotel, depending on TELEPHONY_PROVIDER)
 * hits this URL each time the call moves through ringing → in-progress →
 * completed/failed/busy/no-answer.
 *
 * We map the carrier's status to our `calls` table outcome + duration.
 *
 * To enable: in your Twilio number's voice config, set
 *   "Status Callback URL" = https://<your-host>/api/webhooks/twilio/status
 *   "Status Callback Events" = completed (and optionally ringing, in-progress)
 */
export async function POST(req: NextRequest) {
  const provider = getTelephonyProvider()
  const { rawBody, params } = await readFormBody(req)

  const webhookUrl =
    (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') +
    '/api/webhooks/twilio/status'

  const verified = await provider.verifyWebhook({
    url: webhookUrl,
    headers: req.headers,
    rawBody,
    formParams: params,
  })

  if (!verified && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = provider.parseCallStatus(params)
  if (!status.callSid) {
    return NextResponse.json({ error: 'Missing CallSid' }, { status: 400 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  // The current `calls` schema doesn't store the provider call SID directly,
  // so we update the most recent call from the same caller number. Once we
  // add a `provider_call_sid` column we should switch to keying on that.
  const callerNumber = params.From || ''
  const terminal =
    status.status === 'completed' ||
    status.status === 'failed' ||
    status.status === 'busy' ||
    status.status === 'no_answer' ||
    status.status === 'cancelled'

  const update: Record<string, unknown> = {}
  if (status.durationSec !== undefined) {
    update.duration_seconds = status.durationSec
  }
  if (terminal && status.status !== 'completed') {
    // Map non-success terminal states to our outcome enum.
    update.outcome = 'not_booked'
  }

  if (Object.keys(update).length > 0 && callerNumber) {
    await supabase
      .from('calls')
      .update(update)
      .eq('phone_number', callerNumber)
      .order('created_at', { ascending: false })
      .limit(1)
  }

  return NextResponse.json({
    ok: true,
    callSid: status.callSid,
    status: status.status,
    durationSec: status.durationSec ?? null,
  })
}
