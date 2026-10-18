import { ArrowLeft, Mail, Pencil, Phone, Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CustomerFormDialog } from '../components/customers/CustomerFormDialog'
import { OrdersList } from '../components/orders/OrdersList'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { EmptyState, LoadingState, Panel } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useCustomer, useOrderViews, useToday } from '../data/hooks'
import { formatDate } from '../domain/dates'
import { formatMoney } from '../domain/money'
import { isActive, sortOrders } from '../domain/orders'

export function CustomerDetailPage() {
  const { id } = useParams()
  const customer = useCustomer(id)
  const allViews = useOrderViews()
  const today = useToday()
  const [editing, setEditing] = useState(false)

  const mine = useMemo(() => sortOrders((allViews ?? []).filter((v) => v.order.customerId === id), 'entrega', 'asc'), [allViews, id])

  if (customer === undefined || allViews === undefined) return <LoadingState />
  if (customer === null) {
    return (
      <EmptyState
        icon={Users}
        title="No encontramos a este cliente"
        description="Puede que la dirección esté mal escrita o que los datos locales se hayan borrado."
        action={
          <Link to="/clientes" className={buttonClass('primary')}>
            Ir a clientes
          </Link>
        }
      />
    )
  }

  const active = mine.filter((v) => isActive(v.order))
  const previous = mine.filter((v) => !isActive(v.order)).reverse()
  const notCancelled = mine.filter((v) => v.order.status !== 'cancelado')
  const historicTotal = notCancelled.reduce((s, v) => s + v.totalCents, 0)
  const pending = notCancelled.reduce((s, v) => s + Math.max(v.balanceCents, 0), 0)

  return (
    <>
      <Link to="/clientes" className="mb-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        Clientes
      </Link>
      <PageHeader
        title={customer.name}
        description={`Cliente desde ${formatDate(customer.createdAt.slice(0, 10))}`}
        actions={
          <>
            <Button onClick={() => setEditing(true)}>
              <Pencil size={16} aria-hidden="true" />
              Editar
            </Button>
            <Link to={`/pedidos/nuevo?cliente=${customer.id}`} className={buttonClass('primary')}>
              <Plus size={18} aria-hidden="true" />
              Nuevo pedido
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Contacto" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-muted" aria-hidden="true" />
              <dt className="sr-only">Teléfono</dt>
              <dd>{customer.phone ?? <span className="text-muted">Sin teléfono</span>}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-muted" aria-hidden="true" />
              <dt className="sr-only">Correo electrónico</dt>
              <dd className="break-all">{customer.email ?? <span className="text-muted">Sin correo</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Notas internas</dt>
              <dd className="mt-1 whitespace-pre-wrap">{customer.notes ?? <span className="text-muted">Sin notas</span>}</dd>
            </div>
          </dl>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          {[
            { label: 'Pedidos activos', value: String(active.length), hint: 'En curso ahora' },
            { label: 'Total histórico', value: formatMoney(historicTotal), hint: 'Sin contar cancelados' },
            { label: 'Saldo pendiente', value: formatMoney(pending), hint: 'Por cobrar de sus pedidos' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <p className="text-sm text-muted">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{s.value}</p>
              <p className="mt-1 text-xs text-muted">{s.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-base font-semibold">Pedidos activos</h2>
      {active.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-6 text-sm text-muted shadow-card">Este cliente no tiene pedidos activos.</p>
      ) : (
        <OrdersList views={active} today={today} hideCustomer />
      )}

      <h2 className="mb-3 mt-8 text-base font-semibold">Pedidos anteriores</h2>
      {previous.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-6 text-sm text-muted shadow-card">Todavía no hay pedidos entregados o cancelados.</p>
      ) : (
        <OrdersList views={previous} today={today} hideCustomer />
      )}

      <CustomerFormDialog open={editing} onClose={() => setEditing(false)} customer={customer} />
    </>
  )
}
