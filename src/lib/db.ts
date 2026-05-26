import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Service-role client — used in all server/API code.
// Never import this in client components.
export function getDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
