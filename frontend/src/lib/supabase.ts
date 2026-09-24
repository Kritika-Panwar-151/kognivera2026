import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_anon_key'

const isPlaceholder = (val?: string) =>
  !val ||
  val === 'placeholder_anon_key' ||
  val === 'your_supabase_publishable_key' ||
  val.startsWith('your_') ||
  val === 'https://placeholder.supabase.co'

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !isPlaceholder(import.meta.env.VITE_SUPABASE_URL) &&
  !isPlaceholder(import.meta.env.VITE_SUPABASE_ANON_KEY)
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

