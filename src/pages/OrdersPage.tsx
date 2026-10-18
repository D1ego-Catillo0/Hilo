import { ArrowDownUp, Package, Plus, Search, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { OrdersList } from '../components/orders/OrdersList'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { EmptyState, LoadingState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useCustomers, useOrderViews, useToday } from '../data/hooks'
import {
  EMPTY_FILTERS,
  filterOrders,
  sortOrders,
  type DueRange,
  type OrderFilters,
  type OrderSort,
} from '../domain/orders'
import { ORDER_STATUSES, STATUS_LABELS } from '../domain/types'

const DUE_RANGES: DueRange[] = ['todos', 'hoy', 'semana', 'mes']
const DUE_LABELS: Record<DueRange, string> = { todos: 'Cualquier fecha', hoy: 'Hoy', semana: 'Próximos 7 días', mes: 'Próximos 30 días' }
const SORTS: OrderSort[] = ['entrega', 'creacion', 'total', 'estado']
const SORT_LABELS: Record<OrderSort, string> = { entrega: 'Fecha de entrega', creacion: 'Fecha de creación', total: 'Total', estado: 'Estado' }

const selectClass = 'block min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink'

/**
 * Los filtros viven en la dirección (?estado=activos&atrasados=1…), así el Inicio puede enlazar
 * a listas ya filtradas y el navegador conserva los filtros al volver atrás.
 */
export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const views = useOrderViews()
  const customers = useCustomers()
  const today = useToday()

  const statusParam = params.get('estado')
  const dueParam = params.get('entrega')
  const sortParam = params.get('orden')
  const filters: OrderFilters = {
    search: params.get('q') ?? '',
    status: statusParam === 'activos' || ORDER_STATUSES.some((s) => s === statusParam) ? (statusParam as OrderFilters['status']) : 'todos',
    dueRange: DUE_RANGES.find((d) => d === dueParam) ?? 'todos',
    onlyPendingBalance: params.get('saldo') === '1',
    onlyOverdue: params.get('atrasados') === '1',
    customerId: params.get('cliente') ?? '',
  }
  const sort: OrderSort = SORTS.find((s) => s === sortParam) ?? 'entrega'
  const direction = params.get('dir') === 'desc' ? 'desc' : 'asc'

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  const hasFilters =
    filters.search !== '' ||
    filters.status !== EMPTY_FILTERS.status ||
    filters.dueRange !== EMPTY_FILTERS.dueRange ||
    filters.onlyPendingBalance ||
    filters.onlyOverdue ||
    filters.customerId !== ''

  const visible = useMemo(() => (views ? sortOrders(filterOrders(views, filters, today), sort, direction) : []), [views, filters.search, filters.status, filters.dueRange, filters.onlyPendingBalance, filters.onlyOverdue, filters.customerId, today, sort, direction]) // eslint-disable-line react-hooks/exhaustive-deps

  const newButton = (
    <Link to="/pedidos/nuevo" className={buttonClass('primary')}>
      <Plus size={18} aria-hidden="true" />
      Nuevo pedido
    </Link>
  )

  return (
    <>
      <PageHeader title="Pedidos" description="Todos tus encargos, con su estado, fecha de entrega y saldo." actions={views && views.length > 0 ? newButton : undefined} />

      {views === undefined || customers === undefined ? (
        <LoadingState />
      ) : views.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aún no tienes pedidos"
          description="Registra tu primer pedido con sus conceptos, fecha de entrega y anticipo. Aquí podrás buscarlo, filtrarlo y darle seguimiento."
          action={newButton}
        />
      ) : (
        <>
          <section aria-label="Búsqueda y filtros" className="mb-5 rounded-xl border border-line bg-surface p-4 shadow-card">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => update({ q: e.target.value })}
                aria-label="Buscar pedidos"
                placeholder="Buscar por número, cliente, teléfono, producto o notas"
                className="block min-h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-sm placeholder:text-muted/70"
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs font-medium text-muted">
                Estado
                <select className={`${selectClass} mt-1`} value={filters.status} onChange={(e) => update({ estado: e.target.value === 'todos' ? null : e.target.value })}>
                  <option value="todos">Todos</option>
                  <option value="activos">Solo activos</option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-muted">
                Entrega
                <select className={`${selectClass} mt-1`} value={filters.dueRange} onChange={(e) => update({ entrega: e.target.value === 'todos' ? null : e.target.value })}>
                  {DUE_RANGES.map((d) => (
                    <option key={d} value={d}>
                      {DUE_LABELS[d]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-muted">
                Cliente
                <select className={`${selectClass} mt-1`} value={filters.customerId} onChange={(e) => update({ cliente: e.target.value })}>
                  <option value="">Todos los clientes</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="block text-xs font-medium text-muted">Ordenar por</span>
                <div className="mt-1 flex gap-2">
                  <select aria-label="Ordenar por" className={selectClass} value={sort} onChange={(e) => update({ orden: e.target.value === 'entrega' ? null : e.target.value })}>
                    {SORTS.map((s) => (
                      <option key={s} value={s}>
                        {SORT_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => update({ dir: direction === 'asc' ? 'desc' : null })}
                    aria-label={direction === 'asc' ? 'Orden ascendente. Cambiar a descendente' : 'Orden descendente. Cambiar a ascendente'}
                    title={direction === 'asc' ? 'Ascendente' : 'Descendente'}
                    className="px-3"
                  >
                    <ArrowDownUp size={16} aria-hidden="true" />
                    <span className="text-xs">{direction === 'asc' ? 'Asc.' : 'Desc.'}</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <label className="inline-flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-[var(--hilo-primary)]" checked={filters.onlyPendingBalance} onChange={(e) => update({ saldo: e.target.checked ? '1' : null })} />
                Con saldo pendiente
              </label>
              <label className="inline-flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-[var(--hilo-primary)]" checked={filters.onlyOverdue} onChange={(e) => update({ atrasados: e.target.checked ? '1' : null })} />
                Solo atrasados
              </label>
              {hasFilters && (
                <Button size="sm" variant="ghost" onClick={() => setParams({}, { replace: true })}>
                  <X size={15} aria-hidden="true" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </section>

          <p className="mb-3 text-sm text-muted" role="status">
            {visible.length === views.length ? `${views.length} ${views.length === 1 ? 'pedido' : 'pedidos'}` : `${visible.length} de ${views.length} pedidos`}
          </p>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface px-5 py-10 text-center shadow-card">
              <p className="font-medium text-ink">Ningún pedido coincide con tu búsqueda o filtros.</p>
              <div className="mt-4 flex justify-center">
                <Button onClick={() => setParams({}, { replace: true })}>Limpiar filtros</Button>
              </div>
            </div>
          ) : (
            <OrdersList views={visible} today={today} />
          )}
        </>
      )}
    </>
  )
}
