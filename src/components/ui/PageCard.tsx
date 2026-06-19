interface PageCardProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  noPad?: boolean
  className?: string
}

export default function PageCard({ title, subtitle, actions, children, noPad, className }: PageCardProps) {
  return (
    <div className={`rounded-2xl mb-4 ${className || ''}`}
      style={{ background: 'var(--s2)', border: '1px solid var(--b1)' }}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--b1)' }}>
          <div>
            {title && <div className="font-syne text-sm font-bold" style={{ color: 'var(--txt)' }}>{title}</div>}
            {subtitle && <div className="text-[11px] mt-0.5" style={{ color: 'var(--txt2)' }}>{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  )
}
