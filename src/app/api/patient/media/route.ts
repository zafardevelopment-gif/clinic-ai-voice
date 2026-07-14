import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'
import { analyzeConditionImage } from '@/lib/ai/visual-analysis'

const MAX_SIZE_BYTES = 20 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/**
 * POST /api/patient/media  (multipart: file, optional triage_session_id)
 *
 * Pre-visit photo upload of a visible complaint area (e.g. "attach a photo
 * of the affected area before your consultation"). Per spec §6B-ii, a
 * patient/ASHA upload must NEVER receive diagnostic-leaning output —
 * includeDifferential is hardcoded false here (unlike the doctor Co-Pilot's
 * media route), so the patient only ever gets a neutral confirmation that
 * the image was received; any differential-leaning interpretation is only
 * ever generated later, doctor-side, when a doctor explicitly requests it.
 */
export async function POST(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')
  const triageSessionId = formData.get('triage_session_id')

  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG/PNG/WebP images are supported' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'Image must be under 20MB' }, { status: 400 })

  const db = getDb()
  const buffer = new Uint8Array(await file.arrayBuffer())
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `patient-media/${session.patientId}/${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage.from('clinic-media').upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = db.storage.from('clinic-media').getPublicUrl(path)

  const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`
  const result = await analyzeConditionImage(dataUrl, { includeDifferential: false })

  const { data: media, error } = await db
    .from('patient_media')
    .insert({
      patient_id: session.patientId,
      triage_session_id: typeof triageSessionId === 'string' ? triageSessionId : null,
      uploaded_by: 'patient',
      uploaded_by_patient_id: session.patientId,
      media_type: 'condition_photo',
      file_url: urlData.publicUrl,
      ai_extracted_data: {
        description: result.description,
        differential_considerations: null,
        confidence_note: null,
        warnings: result.warnings,
      },
      ai_model: result.aiModel,
    })
    .select('id, media_type, file_url, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Neutral confirmation only — never the AI description/differential, per §6B-ii.
  return NextResponse.json({ id: media.id, mediaType: media.media_type, receivedAt: media.created_at, message: 'Photo received — your doctor will review it.' }, { status: 201 })
}
