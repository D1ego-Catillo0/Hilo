import { ArrowLeft, Ban, CalendarClock, CheckCircle2, CreditCard, Pencil, Printer, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DueDateDialog } from '../components/orders/DueDateDialog'
import { PaymentDialog } from '../components/orders/PaymentDialog'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { EmptyState, LoadingState, Panel } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/Modal'
import { DueSoonBadge, OverdueBadge, PaidBadge, StatusBadge } from '../components/ui/StatusBadge'
import { useOrderActivity, useOrderView, useSettings, useToday } from '../data/hooks'
import { HiloError, repo } from '../data/repository'
import { formatDate, formatDateTime } from '../domain/dates'
import { formatMoney } from '../domain/money'
import { isActive, isDueSoon, isOverdue, itemAmountCents, transitionNeedsConfirmation } from '../domain/orders'
import { CHANNEL_LABELS, ORDER_STATUSES, PAYMENT_METHOD_LABELS, STATUS_LABELS, type OrderStatus } from '../domain/types'

function transitionMessage(from: OrderStatus, to: OrderStatus, pendingBalanceCents: number) {
  if (to === 'cancelado') {
    return (
      <>
        <p>El pedido dejará de aparecer entre los pendientes, pero se conservará en el historial junto con sus pagos.</p>
        <p className="mt-2 text-muted">Hilo no devuelve dinero: si ya recibiste pagos, el reembolso lo haces tú por fuera.</p>
      </>
    )
  }
  if (to === 'entregado') {
    return (
      <>
        <p>
          Este pedido está en «{STATUS_LABELS[from]}». ¿Seguro que quieres marcarlo como entregado sin pasar por «{STATUS_LABELS.listo}»?
        </p>
        {pendingBalanceCents > 0 && <p className="mt-2 text-muted">Todavía tiene un saldo pendiente de {formatMoney(pendingBalanceCents)}.</p>}
      </>
    )
  }
  if (from === 'cancelado' || from === 'entregado') {
    return <p>El pedido está «{STATUS_LABELS[from]}». ¿Quieres reabrirlo y pasarlo a «{STATUS_LABELS[to]}»?</p>
  }
  return <p>Vas a regresar el pedido de «{STATUS_LABELS[from]}» a «{STATUS_LABELS[to]}». ¿Es correcto?</p>
}

export function OrderDetailPage() {
  const { id } = useParams()
  const view = useOrderView(id)
  const activity = useOrderActivity(id)
  const settings = useSettings()
  const today = useToday()
  const [paying, setPaying] = useState(false)
  const [changingDate, setChangingDate] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)

  if (view === undefined) return <LoadingState />
  if (view === null) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="No encontramos este pedido"
        description="Puede que la dirección esté mal escrita o que los datos locales se hayan borrado."
        action={
          <Link to="/pedidos" className={buttonClass('primary')}>
            Ir a pedidos
          </Link>
        }
      />
    )
  }

  const { order, customer, payments, totalCents, paidCents, balanceCents } = view
  const cancelled = order.status === 'cancelado'
  const active = isActive(order)
  const customization = [
    ['Descripción detallada', order.customization.details],
    ['Especificaciones', order.customization.specifications],
    ['Cambios solicitados', order.customization.changes],
    ['Notas internas', order.customization.internalNotes],
  ].filter(([, text]) => text)

  async function applyStatus(to: OrderStatus) {
    try {
      await repo.changeStatus(order.id, to)
      toast.success(to === 'cancelado' ? 'Pedido cancelado. Se conserva en el historial.' : `Estado actualizado: ${STATUS_LABELS[to]}.`)
    } catch (error) {
      toast.error(error instanceof HiloError ? error.message : 'No se pudo cambiar el estado. Inténtalo de nuevo.')
    } finally {
      setPendingStatus(null)
    }
  }

  function requestStatus(to: OrderStatus) {
    if (to === order.status) return
    if (transitionNeedsConfirmation(order.status, to)) setPendingStatus(to)
    else void applyStatus(to)
  }

  return (
    <>
      {/* Encabezado solo para impresión */}
      <div className="mb-4 hidden border-b border-line pb-3 print:block">
        <p className="text-lg font-semibold">{settings.businessName}</p>
        <p className="text-xs text-muted">Pedido impreso con Hilo</p>
      </div>

      <Link to="/pedidos" className="no-print mb-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        Pedidos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Pedido #{order.number}</h1>
            <StatusBadge status={order.status} />
            {isOverdue(order, today) && <OverdueBadge />}
            {isDueSoon(order, today, 3) && <DueSoonBadge />}
          </div>
          <p className="mt-1 text-sm text-muted">
            {customer ? (
              <Link to={`/clientes/${customer.id}`} className="font-medium text-ink hover:text-brand hover:underline">
                {customer.name}
              </Link>
            ) : (
              'Cliente eliminado'
            )}{' '}
            · Creado el {formatDate(order.createdDate)}
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <Link to={`/pedidos/${order.id}/editar`} className={buttonClass('secondary')}>
            <Pencil size={16} aria-hidden="true" />
            Editar
          </Link>
          <Button onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            Imprimir
          </Button>
        </div>
      </div>

      {cancelled && (
        <p role="status" className="mb-5 rounded-xl border border-line bg-app px-5 py-3 text-sm text-muted">
          Este pedido está cancelado. Se conserva en el historial y ya no cuenta como pendiente ni en el saldo por cobrar.
        </p>
      )}

      {/* Acciones de seguimiento */}
      <div className="no-print mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4 shadow-card">
        <label className="block text-xs font-medium text-muted">
          Cambiar estado
          <select
            value={order.status}
            onChange={(e) => requestStatus(e.target.value as OrderStatus)}
            className="mt-1 block min-h-11 min-w-48 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        {active && (
          <Button onClick={() => requestStatus('entregado')}>
            <CheckCircle2 size={16} aria-hidden="true" />
            Marcar como entregado
          </Button>
        )}
        {!cancelled && (
          <Button onClick={() => setChangingDate(true)}>
            <CalendarClock size={16} aria-hidden="true" />
            Modificar fecha de entrega
          </Button>
        )}
        {!cancelled && balanceCents > 0 && (
          <Button variant="primary" onClick={() => setPaying(true)}>
            <CreditCard size={16} aria-hidden="true" />
            Registrar pago
          </Button>
        )}
        {active && (
          <Button variant="danger" className="ml-auto" onClick={() => requestStatus('cancelado')}>
            <Ban size={16} aria-hidden="true" />
            Cancelar pedido
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Productos o servicios">
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{item.name}</p>
                    {item.description && <p className="text-sm text-muted">{item.description}</p>}
                  </div>
                  <p className="text-sm tabular-nums text-muted">
                    {item.quantity} × {formatMoney(item.unitPriceCents)} ={' '}
                    <span className="font-semibold text-ink">{formatMoney(itemAmountCents(item))}</span>
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm font-semibold">
              <span>Total del pedido</span>
              <span className="tabular-nums">{formatMoney(totalCents)}</span>
            </p>
          </Panel>

          <Panel title="Personalización">
            {customization.length === 0 ? (
              <p className="text-sm text-muted">Este pedido no tiene detalles de personalización.</p>
            ) : (
              <dl className="space-y-4 text-sm">
                {customization.map(([label, text]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-muted">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap">{text}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          <Panel
            title="Pagos registrados"
            action={
              !cancelled && balanceCents > 0 ? (
                <Button size="sm" variant="primary" className="no-print" onClick={() => setPaying(true)}>
                  Registrar pago
                </Button>
              ) : undefined
            }
          >
            {payments.length === 0 ? (
              <p className="text-sm text-muted">Aún no hay pagos registrados.</p>
            ) : (
              <ul className="divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {formatDate(p.date)} · {PAYMENT_METHOD_LABELS[p.method]}
                      </p>
                      {p.note && <p className="text-sm text-muted">{p.note}</p>}
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{formatMoney(p.amountCents)}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted">Hilo solo registra pagos: no procesa transferencias, no verifica depósitos bancarios ni realiza cobros.</p>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Resumen">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Entrega</dt>
                <dd className="font-medium">{formatDate(order.dueDate)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Canal de origen</dt>
                <dd className="font-medium">{CHANNEL_LABELS[order.channel]}</dd>
              </div>
              {customer?.phone && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Teléfono</dt>
                  <dd className="font-medium">{customer.phone}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="text-muted">Total</dt>
                <dd className="font-medium tabular-nums">{formatMoney(totalCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Pagado</dt>
                <dd className="font-medium tabular-nums">{formatMoney(paidCents)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-semibold">Saldo pendiente</dt>
                <dd className="text-base font-semibold tabular-nums">{cancelled ? '—' : balanceCents <= 0 ? <PaidBadge /> : formatMoney(balanceCents)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Historial de actividad" className="no-print">
            {activity === undefined ? (
              <p className="text-sm text-muted">Cargando…</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted">Sin actividad registrada.</p>
            ) : (
              <ol className="space-y-4">
                {activity.map((event) => (
                  <li key={event.id} className="relative border-l-2 border-line pl-4">
                    <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-brand" aria-hidden="true" />
                    <p className="text-sm text-ink">{event.message}</p>
                    <p className="text-xs text-muted">{formatDateTime(event.createdAt, settings.timezone)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      <PaymentDialog open={paying} onClose={() => setPaying(false)} view={view} today={today} />
      <DueDateDialog open={changingDate} onClose={() => setChangingDate(false)} order={order} />
      <ConfirmDialog
        open={pendingStatus !== null}
        onClose={() => setPendingStatus(null)}
        title={pendingStatus === 'cancelado' ? `¿Cancelar el pedido #${order.number}?` : 'Confirmar cambio de estado'}
        message={pendingStatus ? transitionMessage(order.status, pendingStatus, balanceCents) : null}
        confirmLabel={pendingStatus === 'cancelado' ? 'Sí, cancelar pedido' : 'Sí, cambiar estado'}
        cancelLabel={pendingStatus === 'cancelado' ? 'No, conservar pedido' : 'Volver'}
        danger={pendingStatus === 'cancelado'}
        onConfirm={() => (pendingStatus ? applyStatus(pendingStatus) : undefined)}
      />
    </>
  )
}
