/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Monthly reminder report builder.
 *
 * Returns aggregated stats for a single clinic + a single calendar month
 * (IST). The API route renders this into HTML; the browser converts to PDF
 * via "Save as PDF" — no heavyweight PDF library needed for now.
 *
 * If you later want server-side PDF binaries (for emailed monthly reports
 * via QStash/Resend), swap this layer for one that pipes the same data
 * through `pdfkit` or `puppeteer`.
 */

export interface MonthlyReportInput {
  clinicId: string
  /** YYYY-MM, e.g. '2026-05'. Interpreted in IST. */
  month: string
}

export interface MonthlyReportData {
  clinic: { id: string; name: string; phone: string | null; city: string | null }
  period: { month: string; label: string; from: string; to: string }
  plan: { code: string; name: string; monthly_call_limit: number | null }
  totals: {
    reminders_sent: number
    answered: number
    no_answer: number
    busy: number
    failed: number
    cancelled: number
    confirmed_count: number
    reschedule_count: number
    cancel_count: number
    avg_duration_sec: number
  }
  by_type: Array<{
    type: string
    sent: number
    answered: number
    confirmed: number
  }>
  daily: Array<{ date: string; sent: number; answered: number }>
}

function admin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any
}

function monthBounds(month: string): { from: string; to: string; label: string } {
  // Treat `month` as an IST month. Convert IST midnight to UTC.
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) throw new Error('invalid_month')
  const istStart = Date.UTC(y, m - 1, 1) - 5.5 * 60 * 60 * 1000
  const istEnd = Date.UTC(y, m, 1) - 5.5 * 60 * 60 * 1000
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
  return {
    from: new Date(istStart).toISOString(),
    to: new Date(istEnd).toISOString(),
    label,
  }
}

export async function buildMonthlyReport(input: MonthlyReportInput): Promise<MonthlyReportData> {
  const db = admin()
  const { from, to, label } = monthBounds(input.month)

  const [{ data: clinic }, { data: sub }, { data: reminders }] = await Promise.all([
    db.from('clinics').select('id, name, phone, city').eq('id', input.clinicId).single(),
    db.from('clinic_subscriptions').select('plan, monthly_call_limit').eq('clinic_id', input.clinicId).single(),
    db.from('appointment_reminders')
      .select('type, status, response, duration_seconds, placed_at, scheduled_at')
      .eq('clinic_id', input.clinicId)
      .gte('scheduled_at', from)
      .lt('scheduled_at', to)
      .limit(10000),
  ])

  if (!clinic) throw new Error('clinic_not_found')

  // Resolve plan display name from subscription_plans.
  let planName = sub?.plan ?? 'unknown'
  if (sub?.plan) {
    const { data: planRow } = await db
      .from('subscription_plans')
      .select('display_name')
      .eq('plan_code', sub.plan)
      .single()
    if (planRow?.display_name) planName = planRow.display_name
  }

  const rows = (reminders || []) as Array<{
    type: string
    status: string
    response: string | null
    duration_seconds: number | null
    placed_at: string | null
    scheduled_at: string
  }>

  // Top-level counters.
  const totals: MonthlyReportData['totals'] = {
    reminders_sent: 0,
    answered: 0,
    no_answer: 0,
    busy: 0,
    failed: 0,
    cancelled: 0,
    confirmed_count: 0,
    reschedule_count: 0,
    cancel_count: 0,
    avg_duration_sec: 0,
  }
  let durationSum = 0
  let durationCount = 0

  const byTypeMap = new Map<string, { sent: number; answered: number; confirmed: number }>()
  const dailyMap = new Map<string, { sent: number; answered: number }>()

  for (const r of rows) {
    // "sent" = anything we actually attempted (anything past 'scheduled').
    const attempted = r.status !== 'scheduled'
    if (attempted) totals.reminders_sent++

    if (r.status === 'answered') totals.answered++
    else if (r.status === 'no_answer') totals.no_answer++
    else if (r.status === 'busy') totals.busy++
    else if (r.status === 'failed') totals.failed++
    else if (r.status === 'cancelled') totals.cancelled++

    if (r.response === 'confirmed') totals.confirmed_count++
    else if (r.response === 'reschedule') totals.reschedule_count++
    else if (r.response === 'cancel') totals.cancel_count++

    if (r.duration_seconds && r.duration_seconds > 0) {
      durationSum += r.duration_seconds
      durationCount++
    }

    const t = byTypeMap.get(r.type) || { sent: 0, answered: 0, confirmed: 0 }
    if (attempted) t.sent++
    if (r.status === 'answered') t.answered++
    if (r.response === 'confirmed') t.confirmed++
    byTypeMap.set(r.type, t)

    // Daily breakdown — bucket by IST date of placed_at (fall back to scheduled_at).
    const ts = new Date((r.placed_at || r.scheduled_at))
    const istDate = new Date(ts.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const d = dailyMap.get(istDate) || { sent: 0, answered: 0 }
    if (attempted) d.sent++
    if (r.status === 'answered') d.answered++
    dailyMap.set(istDate, d)
  }

  totals.avg_duration_sec = durationCount > 0 ? Math.round(durationSum / durationCount) : 0

  const by_type = Array.from(byTypeMap.entries()).map(([type, v]) => ({ type, ...v }))
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  return {
    clinic,
    period: { month: input.month, label, from, to },
    plan: {
      code: sub?.plan ?? 'unknown',
      name: planName,
      monthly_call_limit: sub?.monthly_call_limit ?? null,
    },
    totals,
    by_type,
    daily,
  }
}

/**
 * Render the report as a self-contained HTML document.
 * Includes print-friendly CSS so the user can hit Ctrl+P → Save as PDF
 * and get a clean one-pager.
 */
export function renderReportHtml(data: MonthlyReportData): string {
  const ansRate = data.totals.reminders_sent > 0
    ? Math.round((data.totals.answered / data.totals.reminders_sent) * 100)
    : 0
  const confRate = data.totals.answered > 0
    ? Math.round((data.totals.confirmed_count / data.totals.answered) * 100)
    : 0

  const typeRows = data.by_type
    .map(t => `
      <tr>
        <td style="text-transform:capitalize">${t.type.replace(/_/g, ' ')}</td>
        <td style="text-align:right">${t.sent}</td>
        <td style="text-align:right">${t.answered}</td>
        <td style="text-align:right">${t.confirmed}</td>
      </tr>`)
    .join('')

  const dailyRows = data.daily
    .map(d => `
      <tr>
        <td>${d.date}</td>
        <td style="text-align:right">${d.sent}</td>
        <td style="text-align:right">${d.answered}</td>
      </tr>`)
    .join('')

  const limitText = data.plan.monthly_call_limit === null
    ? 'unlimited'
    : `${data.plan.monthly_call_limit.toLocaleString('en-IN')} included`

  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>${data.clinic.name} — ${data.period.label} Report</title>
<style>
  :root { --acc: #10b981; --txt: #0f1f17; --txt2: #4b5d54; --b: #e4ebe7; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--txt); margin: 0; padding: 32px; background: #fff; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .sub { color: var(--txt2); font-size: 13px; margin-bottom: 24px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { border: 1px solid var(--b); border-radius: 10px; padding: 14px; }
  .kpi .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--txt2); }
  .kpi .val { font-size: 26px; font-weight: 800; color: var(--acc); margin-top: 4px; }
  .kpi .meta { font-size: 11px; color: var(--txt2); margin-top: 2px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--txt2); margin: 24px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--b); text-align: left; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--txt2); }
  .footer { margin-top: 32px; font-size: 11px; color: var(--txt2); border-top: 1px solid var(--b); padding-top: 12px; }
  @media print {
    body { padding: 16px; }
    .no-print { display: none; }
  }
  .actions { margin-bottom: 16px; }
  .actions button { background: var(--acc); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; }
</style>
</head><body>

<div class="actions no-print">
  <button onclick="window.print()">Print / Save as PDF</button>
</div>

<h1>${data.clinic.name}</h1>
<div class="sub">
  ${data.clinic.city || ''} ${data.clinic.phone ? '· ' + data.clinic.phone : ''}<br/>
  Reminder report for <strong>${data.period.label}</strong> · Plan: <strong>${data.plan.name}</strong>
</div>

<div class="kpis">
  <div class="kpi">
    <div class="label">Reminders sent</div>
    <div class="val">${data.totals.reminders_sent}</div>
    <div class="meta">${limitText}</div>
  </div>
  <div class="kpi">
    <div class="label">Answer rate</div>
    <div class="val">${ansRate}%</div>
    <div class="meta">${data.totals.answered} answered / ${data.totals.no_answer} missed</div>
  </div>
  <div class="kpi">
    <div class="label">Confirmation rate</div>
    <div class="val">${confRate}%</div>
    <div class="meta">${data.totals.confirmed_count} confirmed</div>
  </div>
  <div class="kpi">
    <div class="label">Avg duration</div>
    <div class="val">${data.totals.avg_duration_sec}s</div>
    <div class="meta">per answered call</div>
  </div>
</div>

<h2>Breakdown by type</h2>
<table>
  <thead><tr><th>Type</th><th style="text-align:right">Sent</th><th style="text-align:right">Answered</th><th style="text-align:right">Confirmed</th></tr></thead>
  <tbody>${typeRows || '<tr><td colspan="4" style="color:#7a8d83">No reminders this month</td></tr>'}</tbody>
</table>

<h2>Daily activity</h2>
<table>
  <thead><tr><th>Date</th><th style="text-align:right">Sent</th><th style="text-align:right">Answered</th></tr></thead>
  <tbody>${dailyRows || '<tr><td colspan="3" style="color:#7a8d83">No activity</td></tr>'}</tbody>
</table>

<div class="footer">
  Generated by ClinicPing · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
</div>

</body></html>`
}
