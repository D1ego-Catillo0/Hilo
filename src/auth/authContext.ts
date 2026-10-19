import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export interface Profile {
  id: string
  role: 'admin' | 'owner'
  business_id: string | null
  email: string
  display_name: string | null
  consented_version: string | null
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'no-profile'; session: Session }
  | { status: 'error'; session: Session; message: string }
  | { status: 'ready'; session: Session; profile: Profile; needsConsent: boolean }

export interface AuthApi {
  state: AuthState
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  acceptConsent: () => Promise<string | null>
  retry: () => void
}

export const AuthContext = createContext<AuthApi | null>(null)


export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
