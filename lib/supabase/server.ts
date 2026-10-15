import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'
import { getSupabasePublicConfig } from '@/lib/supabase/config'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  const config = getSupabasePublicConfig()

  if (!config) {
    throw new Error('Supabase environment variables are not configured.')
  }

  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })
}
