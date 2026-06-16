/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import { CheckCircle2, Eye, Clock } from 'lucide-react'

type Status = 'new' | 'read' | 'resolved'

interface Inquiry {
  id: string
  name: string
  mobile: string
  role: string | null
  status: Status
  created_at: string
}

const STATUS_LABEL: Record<Status, string> = {
  new: 'new',
  read: 'read',
  resolved: 'resolved',
}

const STATUS_COLOR: Record<Status, string> = {
  new: '#f59e0b',      // amber
  read: '#3b82f6',     // blue
  resolved: '#10b981', // emerald
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full"
      style={{
        background: STATUS_COLOR[status] + '22',
        color: STATUS_COLOR[status],
        border: `1px solid ${STATUS_COLOR[status]}44`,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ background: 'var(--card)', border: '1px solid var(--b1)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--t2)' }}>{label}</span>
      </div>
      <span className="text-3xl font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  async function loadInquiries() {
    setLoading(true)
    try {
      const res = await fetch('/api/contact-inquiry')
      const data = await res.json()
      setInquiries(Array.isArray(data) ? data : [])
    } catch {
      setInquiries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInquiries() }, [])

  async function updateStatus(id: string, status: Status) {
    setUpdating(id)
    try {
      await fetch('/api/contact-inquiry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setInquiries((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status } : i))
      )
    } finally {
      setUpdating(null)
    }
  }

  const counts = {
    new: inquiries.filter((i) => i.status === 'new').length,
    read: inquiries.filter((i) => i.status === 'read').length,
    resolved: inquiries.filter((i) => i.status === 'resolved').length,
    total: inquiries.length,
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Contact Inquiries" subtitle="Leads from website form" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="New" value={counts.new} color="#f59e0b" icon="🆕" />
          <StatCard label="Read" value={counts.read} color="#3b82f6" icon="👁️" />
          <StatCard label="Resolved" value={counts.resolved} color="#10b981" icon="✅" />
          <StatCard label="Total" value={counts.total} color="var(--t1)" icon="📊" />
        </div>

        {/* List */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--b1)', background: 'var(--card)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: 'var(--b1)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>All Inquiries</h2>
            <button
              onClick={loadInquiries}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--b1)', color: 'var(--t2)' }}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--t2)' }}>Loading…</div>
          ) : inquiries.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--t2)' }}>No inquiries yet.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--b1)' }}>
              {inquiries.map((inq) => (
                <div key={inq.id}>
                  {/* Row */}
                  <button
                    onClick={() => {
                      setExpanded(expanded === inq.id ? null : inq.id)
                      if (inq.status === 'new') updateStatus(inq.id, 'read')
                    }}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                  >
                    {/* Status dot */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: STATUS_COLOR[inq.status] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{inq.name}</span>
                        <StatusBadge status={inq.status} />
                        {inq.role && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--b1)', color: 'var(--t2)' }}>
                            {inq.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>
                        {inq.mobile} · {formatDate(inq.created_at)}
                      </p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--t2)' }}>
                      {expanded === inq.id ? '▲' : '▼'}
                    </span>
                  </button>

                  {/* Expanded detail */}
                  {expanded === inq.id && (
                    <div
                      className="px-5 pb-5 pt-2 space-y-4"
                      style={{ background: 'var(--bg)', borderTop: '1px solid var(--b1)' }}
                    >
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--t2)' }}>Name</p>
                          <p style={{ color: 'var(--t1)' }}>{inq.name}</p>
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--t2)' }}>Mobile</p>
                          <p style={{ color: 'var(--t1)' }}>{inq.mobile}</p>
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--t2)' }}>Role</p>
                          <p style={{ color: 'var(--t1)' }}>{inq.role || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--t2)' }}>Received</p>
                          <p style={{ color: 'var(--t1)' }}>{formatDate(inq.created_at)}</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => updateStatus(inq.id, 'read')}
                          disabled={inq.status === 'read' || updating === inq.id}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                          style={{ background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644' }}
                        >
                          <Eye className="w-3 h-3" /> Mark as Read
                        </button>
                        <button
                          onClick={() => updateStatus(inq.id, 'resolved')}
                          disabled={inq.status === 'resolved' || updating === inq.id}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                          style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mark as Resolved
                        </button>
                        <button
                          onClick={() => updateStatus(inq.id, 'new')}
                          disabled={inq.status === 'new' || updating === inq.id}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                          style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}
                        >
                          <Clock className="w-3 h-3" /> Mark as New
                        </button>
                        <a
                          href={`https://wa.me/91${inq.mobile.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          style={{ background: '#25D36622', color: '#25D366', border: '1px solid #25D36644' }}
                        >
                          💬 WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
