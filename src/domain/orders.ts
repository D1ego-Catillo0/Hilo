import { addDaysISO } from './dates'
import type { Customer, Order, OrderItem, OrderStatus, Payment } from './types'

/* ------------------------------------------------------------------ */
/* Cálculos financieros (única fuente de verdad; no duplicar en la UI) */
/* ------------------------------------------------------------------ */

/** Importe de un concepto = cantidad × precio unitario, en centavos. */
export function itemAmountCents(item: Pick<OrderItem, 'quantity' | 'unitPriceCents'>): number {
  return Math.round(item.quantity * item.unitPriceCents)
}

/** Total del pedido = suma de sus conceptos. */
export function orderTotalCents(order: Pick<Order, 'items'>): number {
  return order.items.reduce((sum, item) => sum + itemAmountCents(item), 0)
}

/** Total pagado = suma de los pagos registrados. */
export function totalPaidCents(payments: Pick<Payment, 'amountCents'>[]): number {
  return payments.reduce((sum, p) => sum + p.amountCents, 0)
}

/** Saldo pendiente = total del pedido − total pagado. */
export function balanceCents(order: Pick<Order, 'items'>, payments: Pick<Payment, 'amountCents'>[]): number {
  return orderTotalCents(order) - totalPaidCents(payments)
}

/* ------------------------------------------------------------------ */
/* Estados                                                             */
/* ------------------------------------------------------------------ */

const FINAL_STATUSES: OrderStatus[] = ['entregado', 'cancelado']

/** Un pedido "activo" es el que aún requiere trabajo operativo. */
export function isActive(order: Pick<Order, 'status'>): boolean {
  return !FINAL_STATUSES.includes(order.status)
}

/** Atrasado: sigue activo y su fecha de entrega ya pasó (hoy no cuenta como atraso). */
export function isOverdue(order: Pick<Order, 'status' | 'dueDate'>, today: string): boolean {
  return isActive(order) && order.dueDate < today
}

/** Próximo a vencer: activo, no atrasado y con entrega dentro de los siguientes `days` días. */
export function isDueSoon(order: Pick<Order, 'status' | 'dueDate'>, today: string, days = 3): boolean {
  return isActive(order) && order.dueDate >= today && order.dueDate <= addDaysISO(today, days)
}

const STATUS_ORDER: Record<OrderStatus, number> = {
  pendiente: 0,
  confirmado: 1,
  en_preparacion: 2,
  listo: 3,
  entregado: 4,
  cancelado: 5,
}

/**
 * Una transición necesita confirmación cuando es contradictoria:
 * retroceder en el flujo, salir de un estado final (entregado/cancelado),
 * o saltar a "entregado" sin pasar por "listo".
 */
export function transitionNeedsConfirmation(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false
  if (FINAL_STATUSES.includes(from)) return true
  if (to === 'cancelado') return true
  if (STATUS_ORDER[to] < STATUS_ORDER[from]) return true
  if (to === 'entregado' && from !== 'listo') return true
  return false
}

/* ------------------------------------------------------------------ */
/* Pagos                                                               */
/* ------------------------------------------------------------------ */

export type PaymentCheck =
  | { ok: true }
  | { ok: false; reason: 'no_positivo' | 'excede_saldo' }

/** Valida un pago nuevo contra el saldo actual. Un pago mayor al saldo requiere confirmación o se rechaza. */
export function checkPayment(amountCents: number, currentBalanceCents: number): PaymentCheck {
  if (!Number.isInteger(amountCents) || amountCents <= 0) return { ok: false, reason: 'no_positivo' }
  if (amountCents > currentBalanceCents) return { ok: false, reason: 'excede_saldo' }
  return { ok: true }
}

/* ------------------------------------------------------------------ */
/* Vista enriquecida y filtros                                         */
/* ------------------------------------------------------------------ */

export interface OrderView {
  order: Order
  customer: Customer | undefined
  payments: Payment[]
  totalCents: number
  paidCents: number
  balanceCents: number
}

export function buildOrderView(order: Order, customer: Customer | undefined, payments: Payment[]): OrderView {
  const totalCents = orderTotalCents(order)
  const paidCents = totalPaidCents(payments)
  return { order, customer, payments, totalCents, paidCents, balanceCents: totalCents - paidCents }
}

export type DueRange = 'todos' | 'hoy' | 'semana' | 'mes'

export interface OrderFilters {
  search: string
  status: OrderStatus | 'todos' | 'activos'
  dueRange: DueRange
  onlyPendingBalance: boolean
  onlyOverdue: boolean
  customerId: string
}

export const EMPTY_FILTERS: OrderFilters = {
  search: '',
  status: 'todos',
  dueRange: 'todos',
  onlyPendingBalance: false,
  onlyOverdue: false,
  customerId: '',
}

export type OrderSort = 'entrega' | 'creacion' | 'total' | 'estado'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function matchesSearch(view: OrderView, query: string): boolean {
  const q = normalize(query.trim())
  if (!q) return true
  const o = view.order
  const haystack = normalize(
    [
      String(o.number),
      `#${o.number}`,
      view.customer?.name ?? '',
      view.customer?.phone ?? '',
      o.items.map((i) => `${i.name} ${i.description ?? ''}`).join(' '),
      o.customization.details,
      o.customization.specifications,
      o.customization.changes,
      o.customization.internalNotes,
    ].join(' '),
  )
  return haystack.includes(q)
}

export function filterOrders(views: OrderView[], filters: OrderFilters, today: string): OrderView[] {
  return views.filter((v) => {
    const o = v.order
    if (!matchesSearch(v, filters.search)) return false
    if (filters.status === 'activos' && !isActive(o)) return false
    if (filters.status !== 'todos' && filters.status !== 'activos' && o.status !== filters.status) return false
    if (filters.customerId && o.customerId !== filters.customerId) return false
    if (filters.onlyPendingBalance && !(v.balanceCents > 0 && o.status !== 'cancelado')) return false
    if (filters.onlyOverdue && !isOverdue(o, today)) return false
    if (filters.dueRange === 'hoy' && o.dueDate !== today) return false
    if (filters.dueRange === 'semana' && !(o.dueDate >= today && o.dueDate <= addDaysISO(today, 7))) return false
    if (filters.dueRange === 'mes' && !(o.dueDate >= today && o.dueDate <= addDaysISO(today, 30))) return false
    return true
  })
}

export function sortOrders(views: OrderView[], sort: OrderSort, direction: 'asc' | 'desc' = 'asc'): OrderView[] {
  const sign = direction === 'asc' ? 1 : -1
  const key = (v: OrderView): string | number => {
    switch (sort) {
      case 'entrega':
        return v.order.dueDate
      case 'creacion':
        return v.order.createdDate
      case 'total':
        return v.totalCents
      case 'estado':
        return STATUS_ORDER[v.order.status]
    }
  }
  return [...views].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka < kb) return -1 * sign
    if (ka > kb) return 1 * sign
    return (a.order.number - b.order.number) * sign
  })
}

/* ------------------------------------------------------------------ */
/* Métricas del dashboard                                              */
/* ------------------------------------------------------------------ */

export interface DashboardMetrics {
  activeCount: number
  dueSoonCount: number
  overdueCount: number
  /** Saldo por cobrar de pedidos no cancelados. */
  pendingBalanceCents: number
  /** Dinero registrado como recibido (pagos de pedidos no cancelados). */
  receivedCents: number
}

export function computeDashboardMetrics(views: OrderView[], today: string): DashboardMetrics {
  const notCancelled = views.filter((v) => v.order.status !== 'cancelado')
  return {
    activeCount: views.filter((v) => isActive(v.order)).length,
    dueSoonCount: views.filter((v) => isDueSoon(v.order, today, 7)).length,
    overdueCount: views.filter((v) => isOverdue(v.order, today)).length,
    pendingBalanceCents: notCancelled.reduce((s, v) => s + Math.max(v.balanceCents, 0), 0),
    receivedCents: notCancelled.reduce((s, v) => s + v.paidCents, 0),
  }
}
