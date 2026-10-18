import { useLiveQuery } from 'dexie-react-hooks'
import { todayIn } from '../domain/dates'
import { buildOrderView, type OrderView } from '../domain/orders'
import type { ActivityEvent, BusinessSettings, Customer, Payment } from '../domain/types'
import { db } from './db'
import { DEFAULT_SETTINGS } from './repository'

/*
 * Hooks de lectura "en vivo": la pantalla se actualiza sola cuando cambian los datos.
 * Devuelven `undefined` mientras cargan.
 */

export function useSettings(): BusinessSettings {
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  return settings ?? DEFAULT_SETTINGS
}

/** Fecha de hoy (AAAA-MM-DD) según la zona horaria configurada. */
export function useToday(): string {
  const { timezone } = useSettings()
  return todayIn(timezone)
}

export function useCustomers(): Customer[] | undefined {
  return useLiveQuery(() => db.customers.orderBy('name').toArray(), [])
}

export function useCustomer(id: string | undefined): Customer | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.customers.get(id)) ?? null) : null), [id])
}

export function useOrderViews(): OrderView[] | undefined {
  return useLiveQuery(async () => {
    const [orders, customers, payments] = await Promise.all([db.orders.toArray(), db.customers.toArray(), db.payments.toArray()])
    const customerById = new Map(customers.map((c) => [c.id, c]))
    const paymentsByOrder = new Map<string, Payment[]>()
    for (const p of payments) {
      const list = paymentsByOrder.get(p.orderId)
      if (list) list.push(p)
      else paymentsByOrder.set(p.orderId, [p])
    }
    return orders.map((o) => buildOrderView(o, customerById.get(o.customerId), paymentsByOrder.get(o.id) ?? []))
  }, [])
}

/** Un pedido con su cliente y pagos. `null` si no existe. */
export function useOrderView(id: string | undefined): OrderView | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null
    const order = await db.orders.get(id)
    if (!order) return null
    const [customer, payments] = await Promise.all([db.customers.get(order.customerId), db.payments.where('orderId').equals(id).sortBy('date')])
    return buildOrderView(order, customer, payments)
  }, [id])
}

/** Historial de actividad de un pedido, del más reciente al más antiguo. */
export function useOrderActivity(orderId: string | undefined): ActivityEvent[] | undefined {
  return useLiveQuery(async () => {
    if (!orderId) return []
    const events = await db.activity.where('orderId').equals(orderId).sortBy('createdAt')
    return events.reverse()
  }, [orderId])
}
