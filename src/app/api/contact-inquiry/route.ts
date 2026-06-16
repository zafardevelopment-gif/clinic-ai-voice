import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

// POST — save a new inquiry (public, no auth)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, mobile, role } = body

    if (!name || !mobile) {
      return NextResponse.json({ error: 'Name and mobile are required' }, { status: 400 })
    }

    const db = getDb()
    const { data, error } = await db
      .from('contact_inquiries')
      .insert({ name, mobile, role: role || null, status: 'new' })
      .select('id')
      .single()

    if (error) {
      console.error('contact_inquiry insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('contact_inquiry POST error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET — list all inquiries (admin only)
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const db = getDb()
  const { data, error } = await db
    .from('contact_inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — update status (admin only)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id, status } = await req.json()
  if (!id || !['new', 'read', 'resolved'].includes(status)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const db = getDb()
  const { error } = await db
    .from('contact_inquiries')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
