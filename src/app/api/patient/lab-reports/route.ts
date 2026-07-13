import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'
import { extractLabMarkersFromImage } from '@/lib/ai/lab-report-ocr'

const MAX_SIZE_BYTES = 20 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * GET  /api/patient/lab-reports   list own reports
 * POST /api/patient/lab-reports   upload a report photo — stores it (reusing
 *   the clinic-media bucket, same path convention as the clinic upload
 *   route) AND auto-extracts markers via OCR, since there's no staff member
 *   to enter them manually in the self-upload flow.
 */
export async function GET(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('lab_reports')
    .select('id, report_date, lab_name, status, uploaded_file_url, created_at')
    .eq('patient_id', session.patientId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG/PNG/WebP images are supported' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })

  const labName = (formData.get('lab_name') as string | null) || null
  const reportDate = (formData.get('report_date') as string | null) || null

  const db = getDb()

  const { data: report, error: reportErr } = await db
    .from('lab_reports')
    .insert({
      patient_id: session.patientId,
      uploaded_by_patient_id: session.patientId,
      clinic_id: null,
      lab_name: labName,
      report_date: reportDate,
    })
    .select()
    .single()
  if (reportErr || !report) return NextResponse.json({ error: reportErr?.message || 'Failed to create report' }, { status: 500 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `lab-reports/patient-${session.patientId}/${report.id}-${Date.now()}.${ext}`
  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await db.storage.from('clinic-media').upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = db.storage.from('clinic-media').getPublicUrl(path)
  await db.from('lab_reports').update({ uploaded_file_url: urlData.publicUrl }).eq('id', report.id)

  const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`
  const ocrResult = await extractLabMarkersFromImage(dataUrl)

  if (ocrResult.markers.length > 0) {
    const { error: markersErr } = await db.from('lab_report_markers').insert(
      ocrResult.markers.map((m, i) => ({
        lab_report_id: report.id,
        marker_name: m.marker_name,
        value: m.value,
        unit: m.unit,
        reference_range: m.reference_range,
        is_abnormal: m.flag !== 'normal',
        flag: m.flag,
        sort_order: i,
      })),
    )
    if (markersErr) return NextResponse.json({ error: markersErr.message }, { status: 500 })
    await db.from('lab_reports').update({ status: 'entered' }).eq('id', report.id)
  }

  return NextResponse.json({
    report: { ...report, uploaded_file_url: urlData.publicUrl },
    ocr: ocrResult,
  }, { status: 201 })
}
