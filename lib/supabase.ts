import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only client using the service role key. Never import from client components.
let client: SupabaseClient<any, 'dormir', 'dormir'> | null = null

export function db() {
  if (client) return client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  client = createClient<any, 'dormir', 'dormir'>(url, key, {
    db: { schema: 'dormir' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
