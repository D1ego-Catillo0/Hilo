import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { balanceCents, orderTotalCents, totalPaidCents } from '../domain/orders'
import { HiloDB } from './db'
import { HiloError, createRepository } from './repository'

let database: HiloDB
let repo: ReturnType<typeof createRepository>
let counter = 0

const customization = { details: '', specifications: '', changes: '', internalNotes: '' }

async function newOrder(extra: { initial?: number } = {}) {
  const customer = await repo.createCustomer({ name: 'Ana López', phone: '5512345678' })
  return repo.createOrder({
    customerId: customer.id,
    createdDate: '2026-10-10',
    dueDate: '2026-10-20',
    channel: 'whatsapp',
    items: [
      { name: 'Pastel', quantity: 2, unitPriceCents: 45000 },
      { name: 'Cupcakes', quantity: 12, unitPriceCents: 2500 },
    ],
    customization,
    initialPayment: extra.initial ? { amountCents: extra.initial, date: '2026-10-10', method: 'efectivo' } : undefined,
  })
}

beforeEach(() => {
  counter += 1
  database = new HiloDB(`hilo-test-${counter}`)
  repo = createRepository(database)
})

describe('repositorio', () => {
  it('genera números de pedido consecutivos y respeta el número inicial', async () => {
    await repo.updateSettings({ nextOrderNumber: 100 })
    const a = await newOrder()
    const b = await newOrder()
    expect(a.number).toBe(100)
    expect(b.number).toBe(101)
    expect((await repo.getSettings()).nextOrderNumber).toBe(102)
  })

  it('crea el pedido con anticipo como primer pago y registra actividad', async () => {
    const order = await newOrder({ initial: 50000 })
    const payments = await database.payments.where('orderId').equals(order.id).toArray()
    expect(orderTotalCents(order)).toBe(120000)
    expect(totalPaidCents(payments)).toBe(50000)
    expect(balanceCents(order, payments)).toBe(70000)
    const activity = await database.activity.where('orderId').equals(order.id).toArray()
    expect(activity.map((a) => a.type).sort()).toEqual(['pago_registrado', 'pedido_creado'])
  })

  it('acumula pagos parciales y rechaza pagos mayores al saldo', async () => {
    const order = await newOrder({ initial: 50000 })
    await repo.addPayment(order.id, { amountCents: 40000, date: '2026-10-12', method: 'transferencia' })
    await expect(repo.addPayment(order.id, { amountCents: 50000, date: '2026-10-13', method: 'efectivo' })).rejects.toMatchObject({
      code: 'pago_excede_saldo',
    })
    await expect(repo.addPayment(order.id, { amountCents: 0, date: '2026-10-13', method: 'efectivo' })).rejects.toBeInstanceOf(HiloError)
    await repo.addPayment(order.id, { amountCents: 30000, date: '2026-10-14', method: 'efectivo' })
    const payments = await database.payments.where('orderId').equals(order.id).toArray()
    expect(payments).toHaveLength(3)
    expect(balanceCents(order, payments)).toBe(0)
  })

  it('editar el pedido no borra pagos ni historial', async () => {
    const order = await newOrder({ initial: 50000 })
    await repo.updateOrder(order.id, { dueDate: '2026-10-25' })
    const payments = await database.payments.where('orderId').equals(order.id).toArray()
    const activity = await database.activity.where('orderId').equals(order.id).toArray()
    expect(payments).toHaveLength(1)
    expect(activity.map((a) => a.type)).toContain('entrega_modificada')
    expect(activity.map((a) => a.type)).toContain('pedido_creado')
  })

  it('cancelar conserva el pedido en el historial y bloquea nuevos pagos', async () => {
    const order = await newOrder()
    await repo.changeStatus(order.id, 'cancelado')
    const stored = await database.orders.get(order.id)
    expect(stored?.status).toBe('cancelado')
    await expect(repo.addPayment(order.id, { amountCents: 1000, date: '2026-10-11', method: 'efectivo' })).rejects.toMatchObject({
      code: 'pedido_cancelado',
    })
  })

  it('exige cliente existente y al menos un concepto', async () => {
    await expect(
      repo.createOrder({ customerId: 'no-existe', createdDate: '2026-10-10', dueDate: '2026-10-20', channel: 'otro', items: [{ name: 'X', quantity: 1, unitPriceCents: 100 }], customization }),
    ).rejects.toMatchObject({ code: 'cliente_no_existe' })
    const c = await repo.createCustomer({ name: 'Pedro' })
    await expect(
      repo.createOrder({ customerId: c.id, createdDate: '2026-10-10', dueDate: '2026-10-20', channel: 'otro', items: [], customization }),
    ).rejects.toMatchObject({ code: 'sin_conceptos' })
  })

  it('detecta clientes duplicados por nombre o teléfono', async () => {
    await repo.createCustomer({ name: 'María Pérez', phone: '55 1234 5678' })
    expect(await repo.findDuplicateCustomer('maria perez')).toBeDefined()
    expect(await repo.findDuplicateCustomer('Otra persona', '5512345678')).toBeDefined()
    expect(await repo.findDuplicateCustomer('Alguien más', '5599999999')).toBeUndefined()
  })
})
