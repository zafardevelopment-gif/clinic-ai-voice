'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Conversation } from '@/types/database'

interface CallMeta {
  phone: string
  patient?: string | null
  type: string
  outcome?: string | null
  duration?: number | null
  date: string
  intent?: string | null
}

interface Props {
  callId: string
  callMeta: CallMeta
}

export default function ConversationView({ callId, callMeta }: Props) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('conversations')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp', { ascending: true })
      .then(({ data }) => {
        setMessages(data || [])
        setLoading(false)
      })
  }, [callId])

  const chips = [
    { label: 'Phone', value: callMeta.phone },
    { label: 'Patient', value: callMeta.patient || 'Unknown' },
    { label: 'Duration', value: callMeta.duration ? `${Math.floor(callMeta.duration / 60)}m ${callMeta.duration % 60}s` : '—' },
    { label: 'Date', value: new Date(callMeta.date).toLocaleString() },
  ]

  return (
    <div className="flex flex-col">
      {/* Meta chips */}
      <div className="flex gap-2 flex-wrap mb-4 pb-4" style={{ borderBottom: '1px solid var(--b1)' }}>
        {chips.map(c => (
          <span key={c.label} className="text-xs px-3 py-1 rounded-full"
            style={{ background: 'var(--s3)', border: '1px solid var(--b2)', color: 'var(--txt2)' }}>
            <b style={{ color: 'var(--txt)' }}>{c.label}:</b> {c.value}
          </span>
        ))}
        <StatusBadge variant={callMeta.type} />
        {callMeta.outcome && <StatusBadge variant={callMeta.outcome} />}
      </div>

      {/* Transcript */}
      {loading ? (
        <div className="py-10 text-center text-sm" style={{ color: 'var(--txt3)' }}>Loading conversation...</div>
      ) : messages.length === 0 ? (
        <div className="py-10 text-center">
          <div className="text-3xl mb-2 opacity-40">💬</div>
          <p className="text-sm" style={{ color: 'var(--txt3)' }}>No conversation transcript recorded</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {messages.map((msg) => {
            const isAI = msg.speaker === 'ai'
            return (
              <div key={msg.id} className={`flex gap-2.5 items-start ${isAI ? '' : 'flex-row-reverse'}`}>
                {/* Avatar */}
                <div className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  style={{
                    width: 32, height: 32,
                    background: isAI ? 'var(--violet-dim)' : 'var(--acc-dim)',
                    color: isAI ? 'var(--violet)' : 'var(--acc)',
                  }}>
                  {isAI ? '🤖' : '👤'}
                </div>

                <div className={`flex flex-col ${isAI ? '' : 'items-end'} max-w-[75%]`}>
                  <div className="text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: 'var(--txt3)' }}>
                    {isAI ? 'AI Agent' : 'Patient'}
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl text-sm leading-relaxed"
                    style={{
                      background: isAI ? 'var(--s3)' : 'var(--acc-dim)',
                      border: `1px solid ${isAI ? 'var(--b2)' : 'rgba(16,185,129,0.22)'}`,
                      color: 'var(--txt)',
                      borderTopLeftRadius: isAI ? 4 : 12,
                      borderTopRightRadius: isAI ? 12 : 4,
                    }}>
                    {msg.message}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--txt3)' }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Outcome bar */}
      {callMeta.outcome && (
        <div className="flex gap-2 mt-4 pt-4 flex-wrap" style={{ borderTop: '1px solid var(--b1)' }}>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold"
            style={callMeta.outcome === 'booked'
              ? { background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid rgba(0,212,170,0.2)' }
              : { background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
            {callMeta.outcome === 'booked' ? '✅' : '❌'} {callMeta.outcome.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      )}
    </div>
  )
}
