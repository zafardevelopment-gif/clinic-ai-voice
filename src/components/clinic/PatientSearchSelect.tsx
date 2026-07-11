'use client'

import { useEffect, useRef, useState } from 'react'

export interface PatientOption { id: string; full_name: string; phone?: string | null; email?: string | null }

interface Props {
  patients: PatientOption[]
  value: string
  onChange: (patientId: string) => void
  placeholder?: string
}

/** Searchable patient picker — type to filter by name, phone, or email. */
export default function PatientSearchSelect({ patients, value, onChange, placeholder = 'Search by name, phone, or email…' }: Props) {
  const selected = patients.find(p => p.id === value) || null
  const [query, setQuery] = useState(selected ? selected.full_name : '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(selected ? selected.full_name : '')
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = patients.filter(p => {
    const q = query.toLowerCase()
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.phone || '').includes(query) ||
      (p.email || '').toLowerCase().includes(q)
    )
  })

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center rounded-lg px-3 py-2.5 gap-2"
        style={{ background: 'var(--s1)', border: `1.5px solid ${value ? 'var(--acc)' : 'var(--b2)'}` }}
      >
        <span style={{ color: 'var(--txt3)', fontSize: 14 }}>🔍</span>
        <input
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            if (value) onChange('')
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--txt)' }}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setQuery('') }}
            style={{ color: 'var(--txt3)', fontSize: 16, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none' }}
          >
            ×
          </button>
        )}
      </div>

      {open && !value && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-lg z-50 overflow-hidden"
          style={{ background: 'var(--s2)', border: '1px solid var(--b2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxHeight: 280, overflowY: 'auto' }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs" style={{ color: 'var(--txt3)' }}>No matching patients</div>
          ) : (
            filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setQuery(p.full_name); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{ color: 'var(--txt)', display: 'block', background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.10)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontWeight: 600 }}>{p.full_name}</span>
                {p.phone && <span style={{ color: 'var(--txt3)', fontSize: 11, marginLeft: 8 }}>{p.phone}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
