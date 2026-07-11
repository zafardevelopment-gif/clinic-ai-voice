import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/** DELETE /api/clinic/ledger/[id] — clinic_admin only, corrects a mistaken entry. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'clinic_admin' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Only a clinic admin can delete a ledger entry' }, { status: 403 })
  }

  const db = getDb()
  const { error } = await db
    .from('clinic_ledger_entries')
    .delete()
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
