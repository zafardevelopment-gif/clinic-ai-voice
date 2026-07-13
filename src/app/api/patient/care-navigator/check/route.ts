import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'
import { checkSymptomText, raiseCareNavigatorFlag } from '@/lib/patient/care-navigator'

/**
 * POST /api/patient/care-navigator/check
 *
 * Ad-hoc "how are you feeling?" symptom check the patient can run any time
 * from the app (not tied to a specific dose/report). Body:
 * { text: string, fever_c?: number, age_group?: string }
 */
export async function POST(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { text?: string; fever_c?: number | null; age_group?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.text?.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 })

  const result = checkSymptomText({
    patientId: session.patientId,
    text: body.text.trim(),
    feverC: body.fever_c,
    ageGroup: body.age_group,
  })

  if (result.triggered && result.severity) {
    const db = getDb()
    await raiseCareNavigatorFlag(db, {
      patientId: session.patientId,
      source: 'symptom_text',
      severity: result.severity,
      summary: result.summary,
      suggestedAction: result.suggestedAction,
      redFlags: result.redFlags,
    })
  }

  return NextResponse.json(result)
}
