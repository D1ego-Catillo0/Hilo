import { Outlet } from 'react-router-dom'
import { useAuth } from './authContext'
import { AuthErrorScreen, AuthLoading, ConsentScreen, LoginScreen, NoProfileScreen } from './AuthScreens'

/** Todo lo que cuelga de esta ruta exige sesión iniciada, cuenta con negocio y consentimiento vigente. */
export function RequireAuth() {
  const { state } = useAuth()
  switch (state.status) {
    case 'loading':
      return <AuthLoading />
    case 'signed-out':
      return <LoginScreen />
    case 'no-profile':
      return <NoProfileScreen />
    case 'error':
      return <AuthErrorScreen message={state.message} />
    case 'ready':
      return state.needsConsent ? <ConsentScreen /> : <Outlet />
  }
}
