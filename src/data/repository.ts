import { DEFAULT_TIMEZONE, formatDate, todayIn } from '../domain/dates'
import { formatMoney } from '../domain/money'
import { balanceCents, checkPayment } from '../domain/orders'
import {
  STATUS_LABELS,
  type ActivityEvent,
  type ActivityType,
  type BusinessSettings,
  type Channel,
  type Customer,
  type Customization,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Payment,
  type PaymentMethod,
} from '../domain/types'
import { db, type HiloDB } from './db'

/** Error con mensaje en español pensado para mostrarse al usuario. */
export class HiloError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'HiloError'
    this.code = code
  }
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'settings',
  businessName: 'Mi negocio',
  currency: 'MXN',
  timezone: DEFAULT_TIMEZONE,
  dateFormat: 'DD/MM/AAAA',
  nextOrderNumber: 1,
  demoPromptHandled: false,
}

const newId = () => crypto.randomUUID()

/**
 * Repositorio: todas las lecturas/escrituras de negocio pasan por aquí.
 * Recibe la base de datos como parámetro para poder probarlo con una base aislada.
 */
export function createRepository(database: HiloDB = db) {
  async function getSettings(): Promise<BusinessSettings> {
    const existing = await database.settings.get('settings')
    if (existing) return existing
    await database.settings.put(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }

  async function updateSettings(patch: Partial<Omit<BusinessSettings, 'id'>>): Promise<BusinessSettings> {
    const current = await getSettings()
    const next = { ...current, ...patch }
    await database.settings.put(next)
    return next
  }

  function activityRecord(orderId: string, type: ActivityType, message: string, isDemo?: boolean): ActivityEvent {
    return { id: newId(), orderId, type, message, createdAt: new Date().toISOString(), ...(isDemo ? { isDemo } : {}) }
  }

  /* ---------------- Clientes ---------------- */

  async function createCustomer(input: { name: string; phone?: string; email?: string; notes?: string }): Promise<Customer> {
    const name = input.name.trim()
    if (!name) throw new HiloError('cliente_sin_nombre', 'El nombre del cliente es obligatorio.')
    const customer: Customer = {
      id: newId(),
      name,
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    await database.customers.add(customer)
    return customer
  }

  async function updateCustomer(
    id: string,
    patch: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'notes'>>,
  ): Promise<void> {
    const current = await database.customers.get(id)
    if (!current) throw new HiloError('cliente_no_existe', 'No se encontró el cliente.')
    const name = (patch.name ?? current.name).trim()
    if (!name) throw new HiloError('cliente_sin_nombre', 'El nombre del cliente es obligatorio.')
    await database.customers.put({
      ...current,
      ...patch,
      name,
      phone: (patch.phone ?? current.phone)?.trim() || undefined,
      email: (patch.email ?? current.email)?.trim() || undefined,
      notes: (patch.notes ?? current.notes)?.trim() || undefined,
    })
  }

  /** Busca un cliente que parezca duplicado (mismo teléfono o mismo nombre). */
  async function findDuplicateCustomer(name: string, phone?: string): Promise<Customer | undefined> {
    const all = await database.customers.toArray()
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    const digits = (s?: string) => (s ?? '').replace(/\D/g, '')
    return all.find(
      (c) => norm(c.name) === norm(name) || (digits(phone).length >= 7 && digits(c.phone) === digits(phone)),
    )
  }

  /* ---------------- Pedidos ---------------- */

  interface NewOrderInput {
    /** Cliente existente. Si se omite, debe indicarse `newCustomer`. */
    customerId?: string
    /** Cliente nuevo: se crea en la misma operación que el pedido (si algo falla, no queda un cliente huérfano). */
    newCustomer?: { name: string; phone?: string; email?: string }
    createdDate: string
    dueDate: string
    channel: Channel
    items: Omit<OrderItem, 'id'>[]
    customization: Customization
    initialPayment?: { amountCents: number; date: string; method: PaymentMethod; note?: string }
  }

  async function createOrder(input: NewOrderInput): Promise<Order> {
    if (input.items.length === 0) throw new HiloError('sin_conceptos', 'Agrega al menos un concepto al pedido.')
    if (!input.customerId && !input.newCustomer) throw new HiloError('cliente_no_existe', 'Selecciona un cliente para el pedido.')
    if (input.newCustomer && !input.newCustomer.name.trim()) throw new HiloError('cliente_sin_nombre', 'El nombre del cliente es obligatorio.')
    return database.transaction('rw', database.orders, database.payments, database.activity, database.settings, database.customers, async () => {
      let customer: Customer | undefined
      if (input.newCustomer) {
        customer = {
          id: newId(),
          name: input.newCustomer.name.trim(),
          phone: input.newCustomer.phone?.trim() || undefined,
          email: input.newCustomer.email?.trim() || undefined,
          createdAt: new Date().toISOString(),
        }
        await database.customers.add(customer)
      } else {
        customer = await database.customers.get(input.customerId!)
      }
      if (!customer) throw new HiloError('cliente_no_existe', 'No se encontró el cliente seleccionado.')
      const settings = await getSettings()
      const now = new Date().toISOString()
      const order: Order = {
        id: newId(),
        number: settings.nextOrderNumber,
        customerId: customer.id,
        createdDate: input.createdDate,
        dueDate: input.dueDate,
        channel: input.channel,
        status: 'pendiente',
        items: input.items.map((i) => ({ ...i, id: newId() })),
        customization: input.customization,
        createdAt: now,
        updatedAt: now,
      }
      await database.orders.add(order)
      await database.settings.put({ ...settings, nextOrderNumber: settings.nextOrderNumber + 1 })
      await database.activity.add(activityRecord(order.id, 'pedido_creado', `Pedido #${order.number} creado para ${customer.name}.`))
      if (input.initialPayment && input.initialPayment.amountCents > 0) {
        const p = input.initialPayment
        await database.payments.add({ id: newId(), orderId: order.id, amountCents: p.amountCents, date: p.date, method: p.method, note: p.note })
        await database.activity.add(activityRecord(order.id, 'pago_registrado', `Anticipo de ${formatMoney(p.amountCents)} registrado.`))
      }
      return order
    })
  }

  /** Edita datos del pedido. Nunca toca los pagos ni el historial existente. */
  async function updateOrder(
    id: string,
    patch: Partial<Pick<Order, 'customerId' | 'dueDate' | 'channel' | 'items' | 'customization' | 'createdDate'>>,
  ): Promise<Order> {
    return database.transaction('rw', database.orders, database.activity, async () => {
      const current = await database.orders.get(id)
      if (!current) throw new HiloError('pedido_no_existe', 'No se encontró el pedido.')
      if (patch.items && patch.items.length === 0) throw new HiloError('sin_conceptos', 'El pedido debe tener al menos un concepto.')
      const next: Order = { ...current, ...patch, updatedAt: new Date().toISOString() }
      await database.orders.put(next)
      const dueChanged = !!patch.dueDate && patch.dueDate !== current.dueDate
      const { dueDate: _prevDue, updatedAt: _prevUpdated, ...restBefore } = current
      const { dueDate: _nextDue, updatedAt: _nextUpdated, ...restAfter } = next
      const otherChanged = JSON.stringify(restBefore) !== JSON.stringify(restAfter)
      if (dueChanged) {
        await database.activity.add(
          activityRecord(id, 'entrega_modificada', `Fecha de entrega cambiada de ${formatDate(current.dueDate)} a ${formatDate(next.dueDate)}.`),
        )
      }
      if (otherChanged) await database.activity.add(activityRecord(id, 'pedido_editado', 'Pedido editado.'))
      return next
    })
  }

  async function changeStatus(id: string, status: OrderStatus): Promise<Order> {
    return database.transaction('rw', database.orders, database.activity, async () => {
      const current = await database.orders.get(id)
      if (!current) throw new HiloError('pedido_no_existe', 'No se encontró el pedido.')
      if (current.status === status) return current
      const next: Order = { ...current, status, updatedAt: new Date().toISOString() }
      await database.orders.put(next)
      const type: ActivityType =
        status === 'entregado' ? 'pedido_entregado' : status === 'cancelado' ? 'pedido_cancelado' : 'estado_actualizado'
      const message =
        status === 'entregado'
          ? 'Pedido marcado como entregado.'
          : status === 'cancelado'
            ? 'Pedido cancelado. Se conserva en el historial.'
            : `Estado actualizado: ${STATUS_LABELS[current.status]} → ${STATUS_LABELS[status]}.`
      await database.activity.add(activityRecord(id, type, message))
      return next
    })
  }

  /* ---------------- Pagos ---------------- */

  async function addPayment(
    orderId: string,
    input: { amountCents: number; date: string; method: PaymentMethod; note?: string },
    options: { allowOverpay?: boolean } = {},
  ): Promise<Payment> {
    return database.transaction('rw', database.orders, database.payments, database.activity, async () => {
      const order = await database.orders.get(orderId)
      if (!order) throw new HiloError('pedido_no_existe', 'No se encontró el pedido.')
      if (order.status === 'cancelado') throw new HiloError('pedido_cancelado', 'No se pueden registrar pagos en un pedido cancelado.')
      const payments = await database.payments.where('orderId').equals(orderId).toArray()
      const check = checkPayment(input.amountCents, balanceCents(order, payments))
      if (!check.ok) {
        if (check.reason === 'no_positivo') throw new HiloError('pago_invalido', 'El importe del pago debe ser mayor a cero.')
        if (!options.allowOverpay) {
          throw new HiloError('pago_excede_saldo', 'El pago es mayor al saldo pendiente. Confirma el importe o ajústalo.')
        }
      }
      const payment: Payment = { id: newId(), orderId, ...input, note: input.note?.trim() || undefined }
      await database.payments.add(payment)
      await database.activity.add(activityRecord(orderId, 'pago_registrado', `Pago de ${formatMoney(payment.amountCents)} registrado.`))
      return payment
    })
  }

  /* ---------------- Utilidades ---------------- */

  async function today(): Promise<string> {
    const s = await getSettings()
    return todayIn(s.timezone)
  }

  return {
    getSettings,
    updateSettings,
    createCustomer,
    updateCustomer,
    findDuplicateCustomer,
    createOrder,
    updateOrder,
    changeStatus,
    addPayment,
    today,
  }
}

export const repo = createRepository()
