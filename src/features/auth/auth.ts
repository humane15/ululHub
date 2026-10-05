import type { Session } from '@supabase/supabase-js'
import { createContext, use } from 'react'
import { supabase } from '../../db/supabase'

export interface AuthState {
  /** undefined = masih memeriksa sesi tersimpan. */
  session: Session | null | undefined
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return value
}

/** Sesi yang pasti ada; hanya dipakai di halaman yang sudah melewati gerbang login. */
export function useSession(): Session {
  const { session } = useAuth()
  if (!session) throw new Error('Belum login')
  return session
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
