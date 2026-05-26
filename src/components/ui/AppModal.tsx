'use client'

interface AppModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 420, md: 520, lg: 680 }

export default function AppModal({ open, onClose, title, children, footer, size = 'md' }: AppModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="animate-modalIn rounded-[22px] p-7 overflow-y-auto"
        style={{
          width: sizeMap[size],
          maxWidth: '90vw',
          maxHeight: '90vh',
          background: 'var(--s2)',
          border: '1px solid var(--b2)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne text-[17px] font-bold" style={{ color: 'var(--txt)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg text-base transition-all"
            style={{ width: 30, height: 30, background: 'var(--s3)', border: '1px solid var(--b2)', color: 'var(--txt2)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
        {footer && (
          <div className="flex justify-end gap-2.5 mt-6 pt-5" style={{ borderTop: '1px solid var(--b1)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
