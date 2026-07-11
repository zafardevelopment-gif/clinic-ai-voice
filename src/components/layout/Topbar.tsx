'use client'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 z-10"
      style={{
        height: 58, minHeight: 58,
        background: 'var(--s1)',
        borderBottom: '1px solid var(--b1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Mobile hamburger — opens the sidebar drawer */}
      <button
        onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
        className="md:hidden flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ width: 36, height: 36, border: '1px solid var(--b2)', color: 'var(--txt)', cursor: 'pointer' }}
        aria-label="Open menu"
      >
        ☰
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="font-syne text-[15px] sm:text-[17px] font-bold tracking-tight leading-tight truncate" style={{ color: 'var(--txt)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--txt3)' }}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  )
}
