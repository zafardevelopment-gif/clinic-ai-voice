import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Sidebar from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/clinic/dashboard')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar role="admin" userName={session.fullName || session.email} />
      <main className="flex flex-col flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
