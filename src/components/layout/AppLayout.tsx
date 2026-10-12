import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, CalendarDays, Home, Menu, Package, Plus, Settings, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { db } from '../../data/db'
import { Logo } from './Logo'

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/pedidos', label: 'Pedidos', icon: Package, end: false },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays, end: false },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, end: false },
  { to: '/configuracion', label: 'Configuración', icon: Settings, end: false },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link to="/" onClick={onNavigate} aria-label="Hilo, ir al inicio" className="rounded-md">
          <Logo />
        </Link>
      </div>

      <div className="px-4">
        <Link
          to="/pedidos/nuevo"
          onClick={onNavigate}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-card transition hover:brightness-110"
        >
          <Plus size={18} aria-hidden="true" />
          Nuevo pedido
        </Link>
      </div>

      <nav aria-label="Navegación principal" className="mt-5 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-app hover:text-ink'
              }`
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-4">
        <p className="truncate text-sm font-semibold text-ink">{settings?.businessName ?? 'Mi negocio'}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block size-2 rounded-full bg-success" aria-hidden="true" />
          Datos guardados en este dispositivo
        </p>
        <Link
          to="/configuracion"
          onClick={onNavigate}
          className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-brand hover:underline"
        >
          <Settings size={14} aria-hidden="true" />
          Ir a configuración
        </Link>
      </div>
    </div>
  )
}

export function AppLayout() {
  const location = useLocation()
  // El menú móvil queda abierto solo mientras la ruta sea la misma en la que se abrió;
  // así se cierra solo al navegar (incluido el botón "atrás" del navegador).
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const menuOpen = openedAt === location.pathname
  const setMenuOpen = (open: boolean) => setOpenedAt(open ? location.pathname : null)

  // Cierra el menú móvil con la tecla Escape.

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenedAt(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-app text-ink">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop"
      >
        Saltar al contenido
      </a>

      {/* Barra lateral en escritorio */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface md:block">
        <SidebarContent />
      </aside>

      {/* Barra superior en móvil */}
      <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface px-3 md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          className="inline-flex size-11 items-center justify-center rounded-lg text-ink hover:bg-app"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <Link to="/" aria-label="Hilo, ir al inicio">
          <Logo />
        </Link>
        <Link
          to="/pedidos/nuevo"
          aria-label="Nuevo pedido"
          className="inline-flex size-11 items-center justify-center rounded-lg bg-brand text-white"
        >
          <Plus size={22} aria-hidden="true" />
        </Link>
      </header>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <div className="no-print fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-surface shadow-pop">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-2 top-3 inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-app"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <main id="contenido" className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
