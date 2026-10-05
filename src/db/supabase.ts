import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** false kalau .env.local belum diisi; aplikasi lalu menampilkan petunjuk konfigurasi. */
export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient<Database> = createClient<Database>(
  url || 'http://localhost',
  key || 'belum-diatur',
  {
    auth: {
      // Implicit flow: link di email tetap bisa dibuka di perangkat lain
      // (minta link di laptop, buka email di HP). PKCE mewajibkan perangkat yang sama.
      flowType: 'implicit',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
