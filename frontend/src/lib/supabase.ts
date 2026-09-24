import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const isPlaceholder = (val?: string) =>
  !val ||
  val === 'placeholder_anon_key' ||
  val === 'your_supabase_publishable_key' ||
  val.startsWith('your_') ||
  val === 'https://placeholder.supabase.co'

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !isPlaceholder(rawUrl) &&
  !isPlaceholder(rawKey)
)

const supabaseUrl = isSupabaseConfigured
  ? rawUrl
  : 'https://rbqyutgvenkzcoiieiik.supabase.co'

const supabaseAnonKey = isSupabaseConfigured
  ? rawKey
  : 'sb_publishable_rrgFTjpfdQKcJ2LCm_CjLw_jhfyf-3K'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
