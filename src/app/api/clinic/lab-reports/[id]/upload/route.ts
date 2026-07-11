import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * POST /api/clinic/lab-reports/[id]/upload
 *
 * Storage-only for V1 — the file is stored and linked to the report but not
 * parsed. Reuses the clinic-media bucket (src/app/api/clinic/website/upload
 * pattern) under a lab-reports/ prefix. V2: OCR/parsing would read this file
 * and auto-populate lab_report_markers.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data: report } = await db
    .from('lab_reports')
    .select('id')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .maybeSingle()
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `lab-reports/${session.clinicId}/${params.id}-${Date.now()}.${ext}`

  const buffer = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await db.storage.from('clinic-media').upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = db.storage.from('clinic-media').getPublicUrl(path)

  await db.from('lab_reports').update({ uploaded_file_url: urlData.publicUrl }).eq('id', params.id)

  return NextResponse.json({ url: urlData.publicUrl })
}
