interface StatCardProps {
  icon: string
  label: string
  value: string | number
  delta?: string
  deltaType?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'teal' | 'amber' | 'rose' | 'violet'
}

const colorMap = {
  blue:   { glow: 'var(--acc)',    dim: 'var(--acc-dim)',    text: 'var(--acc)' },
  teal:   { glow: 'var(--teal)',   dim: 'var(--teal-dim)',   text: 'var(--teal)' },
  amber:  { glow: 'var(--amber)',  dim: 'var(--amber-dim)',  text: 'var(--amber)' },
  rose:   { glow: 'var(--rose)',   dim: 'var(--rose-dim)',   text: 'var(--rose)' },
  violet: { glow: 'var(--violet)', dim: 'var(--violet-dim)', text: 'var(--violet)' },
}

export default function StatCard({ icon, label, value, delta, deltaType = 'neutral', color = 'blue' }: StatCardProps) {
  const c = colorMap[color]

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden transition-all hover:shadow-sm"
      style={{ background: 'var(--s2)', border: '1px solid var(--b1)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center justify-center rounded-[10px] text-lg"
          style={{ width: 40, height: 40, background: c.dim }}>
          {icon}
        </div>
        {delta && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{
            background: deltaType === 'up' ? 'var(--teal-dim)' : deltaType === 'down' ? 'var(--rose-dim)' : 'var(--s3)',
            color: deltaType === 'up' ? 'var(--teal)' : deltaType === 'down' ? 'var(--rose)' : 'var(--txt2)',
          }}>
            {deltaType === 'up' ? '↑' : deltaType === 'down' ? '↓' : ''} {delta}
          </span>
        )}
      </div>

      <div
        className="text-[22px] font-semibold leading-tight mb-1"
        style={{ color: 'var(--txt)', fontFeatureSettings: '"tnum" 1, "lnum" 1', letterSpacing: '-0.01em' }}
      >
        {value}
      </div>
      <div className="text-[12px]" style={{ color: 'var(--txt2)' }}>{label}</div>
    </div>
  )
}
