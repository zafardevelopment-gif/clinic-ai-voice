import { NextRequest, NextResponse } from 'next/server'
import { getPatientSession } from '@/lib/patient-auth'
import { extractPrescriptionFromImage } from '@/lib/ai/prescription-ocr'

const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8MB — vision models don't need print-quality images
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * POST /api/patient/prescriptions/ocr
 *
 * Multipart upload of a prescription photo → returns a DRAFT medicine list
 * for the patient to review/edit in the app. Nothing is persisted here —
 * the patient confirms via POST /api/patient/medicines (source: 'ocr')
 * per-medicine after editing. No storage write either: the image is only
 * held in memory for the single OCR call, not kept.
 */
export async function POST(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG/PNG/WebP images are supported' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'Image must be under 8MB' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`

  const result = await extractPrescriptionFromImage(dataUrl)
  return NextResponse.json(result)
}
