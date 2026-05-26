'use client'

import { ButtonHTMLAttributes } from 'react'

interface AppBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  icon?: string
  fullWidth?: boolean
}

const variants = {
  primary:   { bg: 'var(--acc)',      color: '#fff',          border: 'none',                     hoverBg: '#1a70e0' },
  secondary: { bg: 'var(--s3)',       color: 'var(--txt)',    border: '1px solid var(--b2)',      hoverBg: 'var(--s4)' },
  danger:    { bg: 'var(--rose-dim)', color: 'var(--rose)',   border: '1px solid rgba(255,78,106,0.2)', hoverBg: 'rgba(255,78,106,0.22)' },
  ghost:     { bg: 'transparent',     color: 'var(--txt2)',   border: '1px solid var(--b2)',      hoverBg: 'var(--s3)' },
}

export default function AppBtn({ variant = 'primary', size = 'md', icon, fullWidth, children, className, ...props }: AppBtnProps) {
  const v = variants[variant]
  const h = size === 'sm' ? 32 : 40
  const px = size === 'sm' ? 12 : 18
  const fontSize = size === 'sm' ? 12 : 13

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${fullWidth ? 'w-full' : ''} ${className || ''}`}
      style={{ height: h, paddingLeft: px, paddingRight: px, fontSize, background: v.bg, color: v.color, border: v.border, cursor: 'pointer' }}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  )
}
