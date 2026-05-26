import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'
import Sidebar from '@/components/layout/Sidebar'

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.role !== 'clinic_admin') redirect('/admin/dashboard')

  let clinicName: string | undefined
  if (session.clinicId) {
    const db = getDb()
    const { data: clinic } = await db
      .from('clinics')
      .select('name')
      .eq('id', session.clinicId)
      .single()
    clinicName = clinic?.name ?? undefined
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        role="clinic_admin"
        userName={session.fullName || session.email}
        clinicName={clinicName}
      />
      <main className="flex flex-col flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
