import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { buildMonthlyReport, renderReportHtml } from '@/lib/reports/monthly-report'

/**
 * GET /api/clinic/reports/monthly?month=YYYY-MM[&format=html|json]
 *
 * Returns the monthly reminder report.
 *   - format=html (default): self-contained HTML page with a "Save as PDF"
 *     button. The browser handles the PDF conversion.
 *   - format=json: raw data for embedding in a custom UI.
 *
 * Auth: any logged-in clinic_admin sees their own clinic's report.
 *       Super admins can pass &clinic_id=... to view any clinic.
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const month =
    url.searchParams.get('month') ||
    new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 7)
  const format = url.searchParams.get('format') || 'html'

  let clinicId = session.clinicId
  if (session.role === 'admin') {
    clinicId = url.searchParams.get('clinic_id') || clinicId
  }
  if (!clinicId) {
    return NextResponse.json({ error: 'no_clinic_in_session' }, { status: 400 })
  }

  try {
    const data = await buildMonthlyReport({ clinicId, month })
    if (format === 'json') {
      return NextResponse.json(data)
    }
    return new NextResponse(renderReportHtml(data), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
