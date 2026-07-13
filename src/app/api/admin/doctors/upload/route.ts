import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** POST /api/admin/doctors/upload — doctor avatar upload for the admin-side doctors page (any clinic). */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG/PNG/WebP images are supported' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  const db = getDb()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `doctor-avatars/admin/${Date.now()}.${ext}`

  const buffer = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await db.storage.from('clinic-media').upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = db.storage.from('clinic-media').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl })
}
