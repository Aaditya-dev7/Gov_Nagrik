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

// Fetch config value from citizen_config table
export async function getConfig(key: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('citizen_config')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error || !data) return null
  return data.value
}

// Get the gov/admin site URL for redirects
export async function getGovSiteUrl(): Promise<string> {
  const configUrl = await getConfig('GOV_SITE_URL')
  if (configUrl) return configUrl
  return window.location.origin
}
