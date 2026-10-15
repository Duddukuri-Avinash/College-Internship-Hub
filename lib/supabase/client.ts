import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'
import { getSupabasePublicConfig } from '@/lib/supabase/config'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createBrowserSupabaseClient() {
  const config = getSupabasePublicConfig()

  if (!config) {
    throw new Error('Supabase environment variables are not configured.')
  }

  browserClient ??= createBrowserClient<Database>(config.url, config.key)
  return browserClient
}
