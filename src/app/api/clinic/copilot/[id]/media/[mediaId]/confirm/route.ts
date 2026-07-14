import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import type { ExtractedPrescriptionData, ExtractedVisualData } from '@/types/database'

/**
 * POST /api/clinic/copilot/[id]/media/[mediaId]/confirm  { editedData? }
 *
 * The doctor confirms (optionally after editing) the AI-extracted data
 * before it's treated as part of the record — handwriting OCR and visual
 * analysis are both error-prone enough that nothing here is trusted until
 * this happens (spec §6B). If editedData is provided it replaces
 * ai_extracted_data as the doctor's corrected version; either way
 * doctor_confirmed flips true and the confirming doctor/time is recorded.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; mediaId: string } },
) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['doctor'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { editedData?: ExtractedPrescriptionData | ExtractedVisualData }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const db = getDb()

  const { data: media } = await db
    .from('patient_media')
    .select('id, triage_session_id')
    .eq('id', params.mediaId)
    .eq('triage_session_id', params.id)
    .eq('clinic_id', session.clinicId)
    .maybeSingle()
  if (!media) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: updated, error } = await db
    .from('patient_media')
    .update({
      ...(body.editedData ? { ai_extracted_data: body.editedData } : {}),
      doctor_confirmed: true,
      confirmed_by: session.userId,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', params.mediaId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
