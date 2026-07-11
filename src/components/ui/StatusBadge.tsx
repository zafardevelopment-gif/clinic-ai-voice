type BadgeVariant = 'booked' | 'confirmed' | 'active' | 'inactive' | 'cancelled' |
  'completed' | 'pending' | 'scheduled' | 'query' | 'missed' | 'follow-up' |
  'inquiry' | 'complaint' | 'no_show' | 'not_booked' | 'callback' | 'transferred' |
  'triaged' | 'escalated' | 'emergency' | 'urgent_same_day' | 'routine' | 'follow_up' |
  'adherent' | 'at_risk' | 'rescheduled' | 'sent' | 'delivered' | 'patient_confirmed' |
  'routine_review' | 'discuss_soon' | 'urgent_review' | 'open' | 'resolved' | 'entered' | 'explained' | 'reviewed'

const variantStyles: Record<BadgeVariant, { bg: string; color: string; dot: string }> = {
  booked:      { bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
  confirmed:   { bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
  active:      { bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
  completed:   { bg: 'var(--acc-dim)',    color: 'var(--acc)',    dot: 'var(--acc)' },
  inquiry:     { bg: 'var(--acc-dim)',    color: 'var(--acc)',    dot: 'var(--acc)' },
  pending:     { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  scheduled:   { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  query:       { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  callback:    { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  inactive:    { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  cancelled:   { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  missed:      { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  complaint:   { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  not_booked:  { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  no_show:     { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  'follow-up': { bg: 'var(--violet-dim)', color: 'var(--violet)', dot: 'var(--violet)' },
  transferred: { bg: 'var(--violet-dim)', color: 'var(--violet)', dot: 'var(--violet)' },

  // Clinic OS modules
  triaged:          { bg: 'var(--acc-dim)',    color: 'var(--acc)',    dot: 'var(--acc)' },
  escalated:        { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  emergency:        { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  urgent_same_day:  { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  routine:          { bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
  follow_up:        { bg: 'var(--violet-dim)', color: 'var(--violet)', dot: 'var(--violet)' },
  adherent:         { bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
  at_risk:          { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  rescheduled:      { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  sent:             { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  delivered:        { bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
  patient_confirmed:{ bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
  routine_review:   { bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
  discuss_soon:     { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  urgent_review:    { bg: 'var(--rose-dim)',   color: 'var(--rose)',   dot: 'var(--rose)' },
  open:             { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  resolved:         { bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
  entered:          { bg: 'var(--amber-dim)',  color: 'var(--amber)',  dot: 'var(--amber)' },
  explained:        { bg: 'var(--acc-dim)',    color: 'var(--acc)',    dot: 'var(--acc)' },
  reviewed:         { bg: 'var(--teal-dim)',   color: 'var(--teal)',   dot: 'var(--teal)' },
}

interface StatusBadgeProps {
  variant: BadgeVariant | string
  label?: string
}

export default function StatusBadge({ variant, label }: StatusBadgeProps) {
  const style = variantStyles[variant as BadgeVariant] || { bg: 'var(--s3)', color: 'var(--txt2)', dot: 'var(--txt2)' }
  const displayLabel = label || variant.replace(/_/g, ' ')

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={{ background: style.bg, color: style.color }}>
      <span className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: style.dot }} />
      {displayLabel}
    </span>
  )
}
