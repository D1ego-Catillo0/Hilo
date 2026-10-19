import { LogIn, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'
import { Button } from '../components/ui/Button'
import { LoadingState } from '../components/ui/EmptyState'
import { LEGAL } from '../legal/config'
import { useAuth } from './useAuth'

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app px-4 py-10">
      <Link to="/" aria-label="Hilo">
        <Logo />
      </Link>
      <div className="mt-6 w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-card">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
      <p className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <Link to="/privacidad" className="hover:text-brand hover:underline">Aviso de privacidad</Link>
        <Link to="/terminos" className="hover:text-brand hover:underline">Términos de uso</Link>
        <Link to="/derechos-de-autor" className="hover:text-brand hover:underline">Derechos de autor</Link>
      </p>
      <p className="mt-2 text-xs text-muted">© {LEGAL.anioInicio} Hilo. Todos los derechos reservados.</p>
    </div>
  )
}

const inputClass = 'block min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink'

export function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.')
      return
    }
    setBusy(true)
    setError(null)
    const result = await signIn(email, password)
    if (result) setError(result)
    setBusy(false)
  }

  return (
    <Card title="Iniciar sesión" subtitle="Acceso solo para negocios con una cuenta creada por el administrador de Hilo.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-ink">Correo electrónico</label>
          <input id="login-email" type="email" autoComplete="username" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-ink">Contraseña</label>
          <input id="login-password" type="password" autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          <LogIn size={18} aria-hidden="true" />
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-4 text-xs text-muted">¿No tienes acceso? Solicítalo a quien te contrató Hilo. No es posible registrarse por cuenta propia.</p>
    </Card>
  )
}

export function ConsentScreen() {
  const { acceptConsent, signOut } = useAuth()
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function accept() {
    setBusy(true)
    setError(null)
    const result = await acceptConsent()
    if (result) setError(result)
    setBusy(false)
  }

  return (
    <Card title="Antes de empezar" subtitle="Necesitamos tu consentimiento para tratar tus datos.">
      <div className="space-y-4 text-sm text-ink">
        <p className="flex gap-2">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          Usaremos tus datos y los de tus clientes solo para operar Hilo. No los vendemos ni los usamos para publicidad.
        </p>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>
            He leído y acepto el{' '}
            <Link to="/privacidad" target="_blank" className="text-brand underline">Aviso de privacidad</Link> y los{' '}
            <Link to="/terminos" target="_blank" className="text-brand underline">Términos de uso</Link>, y consiento el tratamiento de mis datos para las finalidades descritas.
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-danger">
            {error}
          </p>
        )}
        <Button variant="primary" className="w-full" disabled={!checked || busy} onClick={accept}>
          {busy ? 'Guardando…' : 'Aceptar y continuar'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={signOut}>
          No acepto, cerrar sesión
        </Button>
      </div>
    </Card>
  )
}

export function NoProfileScreen() {
  const { signOut } = useAuth()
  return (
    <Card title="Cuenta sin negocio asignado" subtitle="Tu usuario existe pero aún no tiene un negocio en Hilo. Pide al administrador que termine de configurarlo.">
      <Button className="w-full" onClick={signOut}>Cerrar sesión</Button>
    </Card>
  )
}

export function AuthErrorScreen({ message }: { message: string }) {
  const { retry, signOut } = useAuth()
  return (
    <Card title="No se pudo cargar tu cuenta" subtitle={message}>
      <div className="space-y-2">
        <Button variant="primary" className="w-full" onClick={retry}>Reintentar</Button>
        <Button variant="ghost" className="w-full" onClick={signOut}>Cerrar sesión</Button>
      </div>
    </Card>
  )
}

export function AuthLoading() {
  return <LoadingState label="Verificando tu sesión…" />
}
