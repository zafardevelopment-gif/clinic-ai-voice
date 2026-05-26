/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * POST /api/voice/save-conversation
 *
 * Saves one or more conversation turns to the conversations table
 * and optionally finalizes the call record (duration, outcome, summary).
 *
 * Body:
 *   {
 *     call_id:     string
 *     messages?:   Array<{ speaker: 'user' | 'ai'; message: string; timestamp?: string }>
 *     finalize?:   boolean
 *     outcome?:    'booked' | 'not_booked' | 'callback' | 'transferred'
 *     duration_seconds?: number
 *     summary?:    string
 *   }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any

  try {
    const body = await req.json()
    const { call_id, messages, finalize, outcome, duration_seconds, summary } = body

    if (!call_id) {
      return NextResponse.json({ error: 'call_id is required' }, { status: 400 })
    }

    // Save conversation turns
    if (messages && Array.isArray(messages) && messages.length > 0) {
      const rows = messages.map((m: { speaker: string; message: string; timestamp?: string }) => ({
        call_id,
        speaker: m.speaker as 'user' | 'ai',
        message: m.message,
        timestamp: m.timestamp || new Date().toISOString(),
      }))

      const { error: convErr } = await supabase.from('conversations').insert(rows)
      if (convErr) {
        console.error('Failed to save conversations:', convErr)
        return NextResponse.json({ error: 'Failed to save messages' }, { status: 500 })
      }
    }

    // Finalize call record
    if (finalize) {
      type CallUpdate = { outcome?: string; duration_seconds?: number; summary?: string }
      const updates: CallUpdate = {}
      if (outcome) updates.outcome = outcome
      if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds
      if (summary) updates.summary = summary

      if (Object.keys(updates).length > 0) {
        await supabase.from('calls').update(updates).eq('id', call_id)
      }
    }

    return NextResponse.json({ success: true, call_id }, { status: 200 })

  } catch (err) {
    console.error('/api/voice/save-conversation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
