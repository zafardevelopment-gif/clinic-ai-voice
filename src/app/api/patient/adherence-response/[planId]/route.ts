import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { AdherenceResponse } from '@/types/database'

const VALID_RESPONSES: AdherenceResponse[] = ['taken', 'missed', 'feeling_better', 'side_effects', 'call_me', 'no_response']

/**
 * POST /api/patient/adherence-response/[planId]
 *
 * Patient reply endpoint for medicine check-ins (WhatsApp/SMS/voice-relayed).
 * No login — the planId (UUID) from the reminder link acts as the token.
 * Body: { response: AdherenceResponse, note?: string, channel?: string }
 *
 * Alert rules are deliberately simple/deterministic (not AI-based) so they
 * never silently fail to fire:
 *   - 2+ consecutive 'missed' replies  → repeated_missed alert
 *   - any 'side_effects' reply         → side_effects alert (immediate)
 *   - any 'call_me' reply              → callback_requested alert (immediate)
 */
export async function POST(req: NextRequest, { params }: { params: { planId: string } }) {
  let body: { response?: string; note?: string; channel?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const response = body.response as AdherenceResponse
  if (!response || !VALID_RESPONSES.includes(response)) {
    return NextResponse.json({ error: `response must be one of: ${VALID_RESPONSES.join(', ')}` }, { status: 400 })
  }

  const db = getDb()
  const { data: plan } = await db
    .from('follow_up_plans')
    .select('id, clinic_id, patient_id, status')
    .eq('id', params.planId)
    .maybeSingle()

  if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  await db.from('adherence_logs').insert({
    follow_up_plan_id: plan.id,
    patient_id: plan.patient_id,
    channel: (body.channel as 'voice' | 'whatsapp' | 'sms' | 'staff') || 'whatsapp',
    response,
    note: body.note || null,
    created_via: 'patient_reply',
  })

  const alertsRaised: string[] = []

  if (response === 'side_effects') {
    await raiseAlert(db, plan.clinic_id, plan.id, plan.patient_id, 'side_effects')
    alertsRaised.push('side_effects')
  }

  if (response === 'call_me') {
    await raiseAlert(db, plan.clinic_id, plan.id, plan.patient_id, 'callback_requested')
    alertsRaised.push('callback_requested')
  }

  if (response === 'missed') {
    const { data: recent } = await db
      .from('adherence_logs')
      .select('response')
      .eq('follow_up_plan_id', plan.id)
      .order('logged_at', { ascending: false })
      .limit(2)

    const lastTwo = (recent || []).map(r => r.response)
    if (lastTwo.length === 2 && lastTwo.every(r => r === 'missed')) {
      await raiseAlert(db, plan.clinic_id, plan.id, plan.patient_id, 'repeated_missed')
      alertsRaised.push('repeated_missed')
    }
  }

  return NextResponse.json({ ok: true, response, alertsRaised })
}

async function raiseAlert(
  db: ReturnType<typeof getDb>,
  clinicId: string,
  planId: string,
  patientId: string,
  alertType: 'repeated_missed' | 'side_effects' | 'callback_requested',
) {
  // Avoid duplicate open alerts of the same type for the same plan.
  const { data: existing } = await db
    .from('adherence_alerts')
    .select('id')
    .eq('follow_up_plan_id', planId)
    .eq('alert_type', alertType)
    .eq('status', 'open')
    .maybeSingle()

  if (existing) return

  await db.from('adherence_alerts').insert({
    clinic_id: clinicId,
    follow_up_plan_id: planId,
    patient_id: patientId,
    alert_type: alertType,
  })
}
