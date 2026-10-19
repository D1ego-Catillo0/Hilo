import { Link } from 'react-router-dom'
import { formatDate } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { isDueSoon, isOverdue, type OrderView } from '../../domain/orders'
import { DemoBadge, DueSoonBadge, OverdueBadge, PaidBadge, StatusBadge } from '../ui/StatusBadge'

function summary(view: OrderView): string {
  const names = view.order.items.map((i) => i.name)
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
}

function Balance({ view }: { view: OrderView }) {
  if (view.order.status === 'cancelado') return <span className="text-muted">—</span>
  if (view.balanceCents <= 0) return <PaidBadge />
  return <span className="font-semibold text-ink">{formatMoney(view.balanceCents)}</span>
}

function DueDate({ view, today }: { view: OrderView; today: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span>{formatDate(view.order.dueDate)}</span>
      {isOverdue(view.order, today) && <OverdueBadge />}
      {isDueSoon(view.order, today, 3) && <DueSoonBadge />}
    </div>
  )
}

interface Props {
  views: OrderView[]
  today: string
  /** Oculta la columna de cliente (por ejemplo, en la ficha del propio cliente). */
  hideCustomer?: boolean
}

/** Tabla en pantallas medianas/grandes y tarjetas en móvil. */
export function OrdersList({ views, today, hideCustomer }: Props) {
  return (
    <>
      {/* Escritorio: tabla */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-card md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <caption className="sr-only">Lista de pedidos</caption>
          <thead className="border-b border-line bg-app text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Pedido</th>
              {!hideCustomer && <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>}
              <th scope="col" className="px-4 py-3 font-semibold">Descripción</th>
              <th scope="col" className="px-4 py-3 font-semibold">Creado</th>
              <th scope="col" className="px-4 py-3 font-semibold">Entrega</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Saldo</th>
              <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {views.map((v) => (
              <tr key={v.order.id} className="hover:bg-app/60">
                <td className="px-4 py-3 font-semibold text-ink">
                  #{v.order.number} {v.order.isDemo && <DemoBadge />}
                </td>
                {!hideCustomer && (
                  <td className="px-4 py-3">
                    {v.customer ? (
                      <Link to={`/clientes/${v.customer.id}`} className="text-ink hover:text-brand hover:underline">
                        {v.customer.name}
                      </Link>
                    ) : (
                      <span className="text-muted">Cliente eliminado</span>
                    )}
                  </td>
                )}
                <td className="max-w-[16rem] truncate px-4 py-3 text-muted" title={summary(v)}>
                  {summary(v)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(v.order.createdDate)}</td>
                <td className="px-4 py-3">
                  <DueDate view={v} today={today} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(v.totalCents)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <Balance view={v} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={v.order.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/pedidos/${v.order.id}`}
                    aria-label={`Abrir pedido ${v.order.number}`}
                    className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas */}
      <ul className="space-y-3 md:hidden">
        {views.map((v) => (
          <li key={v.order.id}>
            <Link to={`/pedidos/${v.order.id}`} className="block rounded-xl border border-line bg-surface p-4 shadow-card active:bg-app">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    #{v.order.number} {v.order.isDemo && <DemoBadge />}
                    {!hideCustomer && <span className="font-medium"> · {v.customer?.name ?? 'Cliente eliminado'}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted">{summary(v)}</p>
                </div>
                <StatusBadge status={v.order.status} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Entrega</dt>
                  <dd><DueDate view={v} today={today} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Total</dt>
                  <dd className="tabular-nums">{formatMoney(v.totalCents)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Saldo pendiente</dt>
                  <dd className="tabular-nums"><Balance view={v} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Creado</dt>
                  <dd>{formatDate(v.order.createdDate)}</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
