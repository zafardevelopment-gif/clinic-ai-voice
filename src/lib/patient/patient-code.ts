import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Generates the human-readable Patient ID shown to independent patients
 * (e.g. "AVX-PT-000123") — quotable when calling a hospital/clinic for
 * reference, even before they've linked to one.
 *
 * Random (not sequential) 6-digit suffix with a unique-index collision
 * retry, rather than a DB sequence — patients table has no single owner
 * sequence to draw from and collisions are astronomically rare at this
 * volume, so a few retries is simpler than adding a Postgres sequence.
 */
export async function generatePatientCode(
  db: SupabaseClient<Database>,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `AVX-PT-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`
    const { data: existing } = await db
      .from('patients')
      .select('id')
      .eq('patient_code', candidate)
      .maybeSingle()
    if (!existing) return candidate
  }
  throw new Error('Failed to generate a unique patient_code after 5 attempts')
}
