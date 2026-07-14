import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import { extractPrescriptionFromImage } from '@/lib/ai/prescription-ocr'
import { analyzeConditionImage } from '@/lib/ai/visual-analysis'
import type { ExtractedPrescriptionData, ExtractedVisualData, PatientMediaType } from '@/types/database'

const MAX_SIZE_BYTES = 20 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']

/**
 * GET  /api/clinic/copilot/[id]/media   list uploads for this session
 * POST /api/clinic/copilot/[id]/media   upload + AI-analyze a prescription photo or condition photo/video
 *
 * Doctor-uploaded only (mirrors the Co-Pilot's doctor-only auth). For a
 * condition photo/video, the doctor gets differential considerations
 * alongside the neutral description (includeDifferential = true) — the
 * spec reserves that to the doctor view; a patient/ASHA self-upload (see
 * /api/patient/media) never gets that field populated.
 *
 * Video: only a single representative frame is analyzed in this pass
 * (multi-frame sampling is a natural fast-follow, not built here) — the
 * uploaded video itself is still stored and linked for the doctor to
 * review directly.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('patient_media')
    .select('*')
    .eq('triage_session_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['doctor'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getDb()
  const { data: triageSession } = await db
    .from('symptom_triage_sessions')
    .select('id, patient_id')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .eq('mode', 'doctor_copilot')
    .maybeSingle()
  if (!triageSession) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file')
  const mediaType = formData.get('media_type') as PatientMediaType | null

  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (!mediaType || !['prescription_photo', 'condition_photo', 'condition_video'].includes(mediaType)) {
    return NextResponse.json({ error: 'media_type must be prescription_photo, condition_photo, or condition_video' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'File must be under 20MB' }, { status: 400 })

  const buffer = new Uint8Array(await file.arrayBuffer())
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `copilot-media/${session.clinicId}/${params.id}-${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage.from('clinic-media').upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = db.storage.from('clinic-media').getPublicUrl(path)

  let extracted: ExtractedPrescriptionData | ExtractedVisualData
  let aiModel: string | null

  if (mediaType === 'prescription_photo') {
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`
    const result = await extractPrescriptionFromImage(dataUrl)
    extracted = { medicines: result.medicines, warnings: result.warnings }
    aiModel = result.aiModel
  } else {
    // condition_photo or condition_video (first frame only in this pass — see file header note).
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`
    const result = await analyzeConditionImage(dataUrl, { includeDifferential: true })
    extracted = {
      description: result.description,
      differential_considerations: result.differentialConsiderations,
      confidence_note: result.confidenceNote,
      warnings: result.warnings,
    }
    aiModel = result.aiModel
  }

  const { data: media, error } = await db
    .from('patient_media')
    .insert({
      clinic_id: session.clinicId,
      patient_id: triageSession.patient_id,
      triage_session_id: params.id,
      uploaded_by: 'doctor',
      uploaded_by_user_id: session.userId,
      media_type: mediaType,
      file_url: urlData.publicUrl,
      ai_extracted_data: extracted,
      ai_model: aiModel,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(media, { status: 201 })
}
