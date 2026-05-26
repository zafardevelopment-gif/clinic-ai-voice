'use client'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header
      className="flex items-center gap-3 px-6 z-10"
      style={{
        height: 58, minHeight: 58,
        background: 'rgba(7,11,18,0.85)',
        borderBottom: '1px solid var(--b1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex-1">
        <h1 className="font-syne text-[17px] font-bold tracking-tight leading-tight" style={{ color: 'var(--txt)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--txt3)' }}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
