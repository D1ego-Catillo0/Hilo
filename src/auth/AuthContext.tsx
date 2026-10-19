import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { LEGAL } from '../legal/config'
import { AuthContext, type AuthApi, type AuthState, type Profile } from './useAuth'
import { friendlyAuthError } from './errors'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  const loadProfile = useCallback(async (session: Session) => {
    const { data, error } = await supabase.from('profiles').select('id, role, business_id, email, display_name, consented_version').eq('id', session.user.id).maybeSingle()
    if (error) {
      setState({ status: 'error', session, message: 'No se pudo cargar tu cuenta. Revisa tu conexión e inténtalo de nuevo.' })
    } else if (!data) {
      setState({ status: 'no-profile', session })
    } else {
      const profile = data as Profile
      setState({ status: 'ready', session, profile, needsConsent: profile.consented_version !== LEGAL.version })
    }
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session) void loadProfile(data.session)
      else setState({ status: 'signed-out' })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'SIGNED_OUT' || !session) setState({ status: 'signed-out' })
      // Se difiere para no llamar a Supabase dentro del propio callback (recomendación de la librería).
      else if (event === 'SIGNED_IN') setTimeout(() => active && void loadProfile(session), 0)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile, attempt])

  const api = useMemo<AuthApi>(
    () => ({
      state,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        return error ? friendlyAuthError(error.message) : null
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setState({ status: 'signed-out' })
      },
      acceptConsent: async () => {
        if (state.status !== 'ready') return 'Sesión no válida.'
        const { error } = await supabase
          .from('profiles')
          .update({ consented_version: LEGAL.version, consented_at: new Date().toISOString() })
          .eq('id', state.profile.id)
        if (error) return 'No se pudo guardar tu aceptación. Inténtalo de nuevo.'
        setState({ ...state, profile: { ...state.profile, consented_version: LEGAL.version }, needsConsent: false })
        return null
      },
      retry: () => {
        setState({ status: 'loading' })
        setAttempt((n) => n + 1)
      },
    }),
    [state],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}

