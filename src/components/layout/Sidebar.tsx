'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface NavItem {
  icon: string
  label: string
  href: string
  badge?: string | number
}

interface NavSection {
  label: string
  items: NavItem[]
}

interface SidebarProps {
  role: 'admin' | 'clinic_admin' | 'doctor' | 'receptionist'
  userName?: string
  clinicName?: string
}

const adminNav: NavSection[] = [
  {
    label: 'Platform',
    items: [
      { icon: '⚡', label: 'Dashboard', href: '/admin/dashboard' },
      { icon: '🏥', label: 'Clinics', href: '/admin/clinics' },
      { icon: '📊', label: 'Analytics', href: '/admin/analytics' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { icon: '💳', label: 'Plans', href: '/admin/plans' },
    ],
  },
  {
    label: 'Management',
    items: [
      { icon: '👥', label: 'Users', href: '/admin/users' },
      { icon: '📞', label: 'All Calls', href: '/admin/calls' },
    ],
  },
  {
    label: 'Leads',
    items: [
      { icon: '📬', label: 'Inquiries', href: '/admin/inquiries' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: '⚙️', label: 'Settings', href: '/admin/settings' },
    ],
  },
]

const clinicNav: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { icon: '📊', label: 'Dashboard', href: '/clinic/dashboard' },
    ],
  },
  {
    label: 'Clinic',
    items: [
      { icon: '🏥', label: 'Departments', href: '/clinic/departments' },
      { icon: '👨‍⚕️', label: 'Doctors', href: '/clinic/doctors' },
      { icon: '🗓️', label: 'Availability', href: '/clinic/availability' },
    ],
  },
  {
    label: 'Patients',
    items: [
      { icon: '🧑‍🤝‍🧑', label: 'Patients', href: '/clinic/patients' },
      { icon: '📅', label: 'Appointments', href: '/clinic/appointments' },
    ],
  },
  {
    label: 'AI Voice',
    items: [
      { icon: '🤖', label: 'AI Dashboard', href: '/clinic/ai-dashboard' },
      { icon: '📞', label: 'Call Logs', href: '/clinic/call-logs' },
      { icon: '⚙️', label: 'Voice Config', href: '/clinic/voice-config' },
    ],
  },
  {
    label: 'Reminders',
    items: [
      { icon: '🔔', label: 'Reminder Settings', href: '/clinic/reminders' },
      { icon: '📜', label: 'Reminder Logs', href: '/clinic/reminders/logs' },
      { icon: '📈', label: 'Monthly Reports', href: '/clinic/reports' },
    ],
  },
  {
    label: 'Clinic OS',
    items: [
      { icon: '💊', label: 'Follow-ups', href: '/clinic/follow-ups' },
      { icon: '🩺', label: 'Symptom Triage', href: '/clinic/triage' },
      { icon: '🧪', label: 'Lab Reports', href: '/clinic/lab-reports' },
      { icon: '💵', label: 'Ledger', href: '/clinic/ledger' },
    ],
  },
  {
    label: 'Website',
    items: [
      { icon: '🌐', label: 'My Website', href: '/clinic/website' },
    ],
  },
]

export default function Sidebar({ role, userName, clinicName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = role === 'admin' ? adminNav : clinicNav
  const [open, setOpen] = useState(false)

  // Topbar's hamburger dispatches this event to open the mobile drawer.
  useEffect(() => {
    const openHandler = () => setOpen(true)
    window.addEventListener('toggle-sidebar', openHandler)
    return () => window.removeEventListener('toggle-sidebar', openHandler)
  }, [])

  // Close the drawer whenever the route changes (mobile).
  useEffect(() => { setOpen(false) }, [pathname])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        />
      )}
      <aside
        className={`flex flex-col fixed md:static inset-y-0 left-0 z-50 transition-transform duration-200 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 230, minWidth: 230, background: 'var(--s1)', borderRight: '1px solid var(--b1)', overflowY: 'auto' }}
      >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5" style={{ borderBottom: '1px solid var(--b1)' }}>
        <div className="flex items-center justify-center text-base flex-shrink-0 rounded-[10px]"
          style={{ width: 36, height: 36, background: 'linear-gradient(135deg, var(--acc), #059669)', boxShadow: '0 4px 14px rgba(46,134,255,0.3)' }}>
          🎙️
        </div>
        <div>
          <div className="font-syne text-sm font-extrabold leading-tight" style={{ color: 'var(--txt)' }}>ClinicAI</div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--txt3)' }}>
            {role === 'admin' ? 'Super Admin' : 'Clinic Panel'}
          </div>
        </div>
        {/* Mobile close */}
        <button
          onClick={() => setOpen(false)}
          className="ml-auto md:hidden flex items-center justify-center rounded-lg"
          style={{ width: 30, height: 30, border: '1px solid var(--b2)', color: 'var(--txt2)', cursor: 'pointer' }}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {nav.map(section => (
          <div key={section.label}>
            <div className="px-4 py-2 text-[10px] uppercase tracking-[1.8px]" style={{ color: 'var(--txt3)' }}>
              {section.label}
            </div>
            {section.items.map(item => {
              const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && item.href !== '/clinic/dashboard' && pathname.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm font-medium transition-all relative"
                    style={{
                      color: isActive ? '#fff' : 'var(--txt2)',
                      background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
                    }}
                  >
                    {isActive && (
                      <div className="absolute left-0 rounded-r-sm" style={{ width: 3, height: '55%', background: 'var(--acc)', top: '50%', transform: 'translateY(-50%)' }} />
                    )}
                    <span className="text-[15px] w-5 text-center flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--acc)', color: '#fff' }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3.5" style={{ borderTop: '1px solid var(--b1)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
            style={{ width: 32, height: 32, background: role === 'admin' ? 'var(--acc-dim)' : 'var(--teal-dim)', color: role === 'admin' ? 'var(--acc)' : 'var(--teal)' }}>
            {(userName || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: 'var(--txt)' }}>{userName || 'User'}</div>
            <div className="text-[11px] truncate" style={{ color: 'var(--txt3)' }}>
              {role === 'admin' ? 'Super Admin' : (clinicName || 'Clinic Admin')}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center rounded-lg text-sm transition-all flex-shrink-0"
            style={{ width: 28, height: 28, background: 'transparent', border: '1px solid var(--b2)', color: 'var(--txt3)', cursor: 'pointer' }}
            title="Logout"
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
    </>
  )
}
