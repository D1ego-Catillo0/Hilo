import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Plus, Sparkles, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { EmptyState, LoadingState, Panel } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { DemoBadge, StatusBadge } from '../components/ui/StatusBadge'
import { useHasDemoData, useOrderViews, useSettings, useToday } from '../data/hooks'
import { repo } from '../data/repository'
import { formatDate } from '../domain/dates'
import { formatMoney } from '../domain/money'
import { attentionItems, computeDashboardMetrics, upcomingDeliveries, type AttentionReason, type OrderView } from '../domain/orders'

const REASON_TEXT: Record<AttentionReason, string> = {
  atrasado: 'Atrasado',
  entrega_hoy: 'Se entrega hoy',
  entrega_proxima: 'Entrega próxima',
  cobro_pendiente: 'Listo con saldo por cobrar',
}

const REASON_STYLE: Record<AttentionReason, string> = {
  atrasado: 'text-danger',
  entrega_hoy: 'text-warning',
  entrega_proxima: 'text-warning',
  cobro_pendiente: 'text-brand',
}

function describe(view: OrderView): string {
  const names = view.order.items.map((i) => i.name)
  return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
}

function relativeDay(date: string, today: string): string {
  if (date === today) return 'Hoy'
  const diff = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000)
  if (diff === 1) return 'Mañana'
  if (diff > 1) return `En ${diff} días`
  if (diff === -1) return 'Ayer'
  return `Hace ${-diff} días`
}

function MetricCard({ to, label, value, hint, icon: Icon, tone = 'text-brand bg-brand-soft' }: { to: string; label: string; value: string; hint: string; icon: typeof Wallet; tone?: string }) {
  return (
    <Link to={to} className="group rounded-xl border border-line bg-surface p-4 shadow-card transition hover:border-brand/40">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted group-hover:text-brand">{hint}</p>
    </Link>
  )
}

export function DashboardPage() {
  const views = useOrderViews()
  const settings = useSettings()
  const today = useToday()
  const hasDemo = useHasDemoData()
  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!views || hasDemo === undefined) return <LoadingState />

  async function loadDemo() {
    await repo.loadDemoData()
    toast.success('Se cargó el Taller de Ejemplo. Puedes quitarlo cuando quieras.')
  }

  async function startEmpty() {
    await repo.dismissDemoPrompt()
  }

  async function removeDemo() {
    await repo.removeDemoData()
    toast.success('Se quitaron los datos de ejemplo.')
  }

  const newOrder = (
    <Link to="/pedidos/nuevo" className={buttonClass('primary')}>
      <Plus size={18} aria-hidden="true" />
      Nuevo pedido
    </Link>
  )

  if (views.length === 0) {
    return (
      <>
        <PageHeader title="Inicio" description={settings.businessName} />
        {settings.demoPromptHandled ? (
          <EmptyState
            icon={ClipboardList}
            title="Aún no tienes pedidos"
            description="Registra tu primer pedido por encargo y aquí verás lo que está por entregar, lo atrasado y lo que te deben."
            action={newOrder}
          />
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Bienvenido a Hilo"
            description="Puedes cargar un negocio de ejemplo para explorar la aplicación con pedidos ya hechos, o empezar desde cero. Los datos de ejemplo se pueden quitar en cualquier momento sin afectar los tuyos."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="primary" onClick={loadDemo}>
                  Cargar ejemplo
                </Button>
                <Button onClick={startEmpty}>Empezar desde cero</Button>
              </div>
            }
          />
        )}
      </>
    )
  }

  const metrics = computeDashboardMetrics(views, today)
  const attention = attentionItems(views, today)
  const upcoming = upcomingDeliveries(views, today, 7)

  return (
    <>
      <PageHeader title="Inicio" description={`${settings.businessName} · hoy es ${formatDate(today)}`} actions={newOrder} />

      {hasDemo && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3">
          <p className="text-sm text-ink">
            <strong>Estás viendo datos de ejemplo.</strong> Explora con libertad; cuando quieras, quítalos y empieza con los tuyos.
          </p>
          <Button size="sm" onClick={() => setConfirmRemove(true)}>
            Quitar datos de ejemplo
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard to="/pedidos?estado=activos" label="Pedidos activos" value={String(metrics.activeCount)} hint="Ver pedidos en curso" icon={ClipboardList} />
        <MetricCard to="/pedidos?estado=activos&entrega=semana" label="Entregas en 7 días" value={String(metrics.dueSoonCount)} hint="Ver próximas entregas" icon={CalendarClock} tone="text-warning bg-warning-soft" />
        <MetricCard to="/pedidos?atrasados=1" label="Atrasados" value={String(metrics.overdueCount)} hint="Ver pedidos atrasados" icon={AlertTriangle} tone="text-danger bg-danger-soft" />
        <MetricCard to="/pedidos?saldo=1" label="Saldo pendiente" value={formatMoney(metrics.pendingBalanceCents)} hint="Ver quién me debe" icon={Wallet} tone="text-warning bg-warning-soft" />
        <MetricCard to="/pedidos" label="Cobrado" value={formatMoney(metrics.receivedCents)} hint="Pagos registrados (sin cancelados)" icon={CheckCircle2} tone="text-success bg-success-soft" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Requieren atención" action={<span className="text-xs text-muted">{attention.length}</span>}>
          {attention.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">Todo en orden: no hay pedidos urgentes.</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {attention.map(({ view, reasons }) => (
                <li key={view.order.id}>
                  <Link to={`/pedidos/${view.order.id}`} className="flex items-start justify-between gap-3 py-3 hover:bg-app/60">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        #{view.order.number} · {view.customer?.name ?? 'Cliente eliminado'} {view.order.isDemo && <DemoBadge />}
                      </p>
                      <p className="truncate text-sm text-muted">{describe(view)}</p>
                      <p className="mt-0.5 text-xs font-semibold">
                        {reasons.map((r, i) => (
                          <span key={r} className={REASON_STYLE[r]}>
                            {i > 0 && ' · '}
                            {REASON_TEXT[r]}
                          </span>
                        ))}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="text-ink">{formatDate(view.order.dueDate)}</p>
                      {view.balanceCents > 0 && <p className="text-xs text-muted">Debe {formatMoney(view.balanceCents)}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Próximas entregas (7 días)"
          action={
            <Link to="/pedidos?estado=activos&entrega=semana" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
              Ver todas <ArrowRight size={12} aria-hidden="true" />
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No hay entregas programadas para los próximos 7 días.</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {upcoming.map((view) => (
                <li key={view.order.id}>
                  <Link to={`/pedidos/${view.order.id}`} className="flex items-start justify-between gap-3 py-3 hover:bg-app/60">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        #{view.order.number} · {view.customer?.name ?? 'Cliente eliminado'}
                      </p>
                      <p className="truncate text-sm text-muted">{describe(view)}</p>
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      <p className="text-sm text-ink">
                        {relativeDay(view.order.dueDate, today)} · {formatDate(view.order.dueDate)}
                      </p>
                      <StatusBadge status={view.order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="¿Quitar los datos de ejemplo?"
        message="Se borrarán los clientes, pedidos y pagos de ejemplo. Lo que hayas creado tú no se toca."
        confirmLabel="Quitar ejemplo"
        danger
        onConfirm={removeDemo}
        onClose={() => setConfirmRemove(false)}
      />
    </>
  )
}
