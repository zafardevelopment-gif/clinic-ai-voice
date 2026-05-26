/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { classifyIntent } from '@/lib/ai/intent-classifier'

/**
 * POST /api/voice/process-intent
 *
 * Called after speech-to-text. Uses an LLM to classify caller intent,
 * extract slots (doctor, date, etc.), updates the call record, and tells
 * the caller-side agent what to do next.
 *
 * Body:
 *   {
 *     call_id:    string
 *     transcript: string  -- STT output (Hindi, English, or Hinglish OK)
 *     intent?:    string  -- pre-classified by upstream (skips LLM call)
 *   }
 *
 * Response shape preserved from the previous keyword-based version so
 * existing telephony clients keep working.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  try {
    const body = await req.json()
    const { call_id, transcript, intent: providedIntent } = body

    if (!call_id || !transcript) {
      return NextResponse.json(
        { error: 'call_id and transcript are required' },
        { status: 400 },
      )
    }

    // Run LLM classifier unless caller already gave us an intent.
    let intent: string
    let callType: 'booking' | 'query' | 'followup'
    let confidence = 1
    let slots: Record<string, unknown> = {}
    let reasoning = 'provided_by_caller'

    if (providedIntent) {
      intent = providedIntent
      callType =
        providedIntent === 'book_appointment' || providedIntent === 'cancel_reschedule'
          ? 'booking'
          : providedIntent === 'followup_inquiry'
            ? 'followup'
            : 'query'
    } else {
      try {
        const classified = await classifyIntent(transcript)
        intent = classified.intent
        callType = classified.callType
        confidence = classified.confidence
        slots = classified.slots
        reasoning = classified.reasoning
      } catch (err) {
        console.error('[process-intent] LLM classification failed:', err)
        // Don't fail the call — fall through with a safe default.
        intent = 'general_query'
        callType = 'query'
        confidence = 0
        reasoning = 'classifier_error'
      }
    }

    // Persist intent + call type. Slots go into metadata if your schema has it.
    await supabase
      .from('calls')
      .update({ call_type: callType, intent })
      .eq('id', call_id)

    // Fetch clinic context for the agent's next turn.
    const { data: call } = await supabase
      .from('calls')
      .select('clinic_id, patient_id, patients(full_name)')
      .eq('id', call_id)
      .single()

    const nextAction =
      intent === 'book_appointment'
        ? 'collect_booking_details'
        : intent === 'cancel_reschedule'
          ? 'find_appointment'
          : intent === 'emergency'
            ? 'transfer_to_human'
            : 'answer_query'

    return NextResponse.json(
      {
        call_id,
        intent,
        call_type: callType,
        confidence,
        reasoning,
        slots,
        next_action: nextAction,
        patient_known: !!call?.patient_id,
        patient_name:
          (call?.patients as { full_name: string } | null)?.full_name || null,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error('/api/voice/process-intent error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
