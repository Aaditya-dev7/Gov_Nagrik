import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function isSupabaseEnabled() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnabled()) {
    try {
      console.warn('[Supabase] Disabled. Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY in environment.')
    } catch {}
    return null
  }
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      {
        auth: {
          // Prevent conflicts when citizen + admin/officer apps are open in the same browser
          storageKey: 'gov_nagrik_admin_auth',
        },
      }
    )
  }
  return client
}
