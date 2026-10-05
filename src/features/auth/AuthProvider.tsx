import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../db/supabase'
import { AuthContext } from './auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // Event pertama (INITIAL_SESSION) membawa sesi tersimpan atau sesi dari link magic.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext value={{ session }}>{children}</AuthContext>
}
