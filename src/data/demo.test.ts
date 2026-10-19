import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { attentionItems, balanceCents, buildOrderView, computeDashboardMetrics, isOverdue, upcomingDeliveries } from '../domain/orders'
import { HiloDB } from './db'
import { buildDemoData, DEFAULT_BUSINESS_NAME, DEMO_BUSINESS_NAME } from './demo'
import { createRepository } from './repository'

const TODAY = '2026-10-19'
let database: HiloDB
let repo: ReturnType<typeof createRepository>
let counter = 0

beforeEach(() => {
  counter += 1
  database = new HiloDB(`hilo-demo-test-${counter}`)
  repo = createRepository(database)
})

function views() {
  const data = buildDemoData(TODAY)
  return data.orders.map((o) =>
    buildOrderView(o, data.customers.find((c) => c.id === o.customerId), data.payments.filter((p) => p.orderId === o.id)),
  )
}

describe('datos de demostración', () => {
  it('todo está marcado como ejemplo y las referencias son válidas', () => {
    const data = buildDemoData(TODAY)
    const all = [...data.customers, ...data.orders, ...data.payments, ...data.activity]
    expect(all.every((x) => x.isDemo === true)).toBe(true)
    const customerIds = new Set(data.customers.map((c) => c.id))
    const orderIds = new Set(data.orders.map((o) => o.id))
    expect(data.orders.every((o) => customerIds.has(o.customerId))).toBe(true)
    expect(data.payments.every((p) => orderIds.has(p.orderId))).toBe(true)
    expect(data.activity.every((a) => orderIds.has(a.orderId))).toBe(true)
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length)
  })

  it('ningún pago deja un saldo negativo y cubre los casos principales', () => {
    const v = views()
    expect(v.every((x) => x.balanceCents >= 0)).toBe(true)
    const statuses = new Set(v.map((x) => x.order.status))
    for (const s of ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado']) expect(statuses.has(s as never)).toBe(true)
    expect(v.some((x) => isOverdue(x.order, TODAY))).toBe(true)
    expect(v.some((x) => x.balanceCents === 0 && x.order.status !== 'cancelado')).toBe(true)
    expect(v.some((x) => x.paidCents > 0 && x.balanceCents > 0)).toBe(true)
  })

  it('las métricas del Inicio coinciden con los datos', () => {
    const m = computeDashboardMetrics(views(), TODAY)
    expect(m.activeCount).toBe(6)
    expect(m.overdueCount).toBe(1)
    expect(m.pendingBalanceCents).toBe(views().filter((x) => x.order.status !== 'cancelado').reduce((s, x) => s + x.balanceCents, 0))
  })

  it('"requieren atención" pone primero lo atrasado y excluye entregados y cancelados', () => {
    const items = attentionItems(views(), TODAY)
    expect(items[0].reasons[0]).toBe('atrasado')
    expect(items.every((i) => !['entregado', 'cancelado'].includes(i.view.order.status))).toBe(true)
    const listo = items.find((i) => i.view.order.status === 'listo')
    expect(listo?.reasons).toContain('entrega_proxima')
    expect(listo?.view.balanceCents).toBe(0)
    expect(listo?.reasons).not.toContain('cobro_pendiente')
  })

  it('las próximas entregas van ordenadas por fecha y dentro del rango', () => {
    const list = upcomingDeliveries(views(), TODAY, 7)
    const dates = list.map((v) => v.order.dueDate)
    expect([...dates].sort()).toEqual(dates)
    expect(dates.every((d) => d >= TODAY && d <= '2026-10-26')).toBe(true)
    expect(list.some((v) => v.order.dueDate > '2026-10-26')).toBe(false)
  })
})

describe('repositorio: ejemplo', () => {
  it('cargar es idempotente, pone el nombre del ejemplo y no toca la numeración real', async () => {
    await repo.loadDemoData()
    await repo.loadDemoData()
    expect(await database.orders.count()).toBe(8)
    expect(await database.customers.count()).toBe(6)
    const s = await repo.getSettings()
    expect(s.businessName).toBe(DEMO_BUSINESS_NAME)
    expect(s.demoPromptHandled).toBe(true)
    expect(s.nextOrderNumber).toBe(1)
    expect(await repo.hasDemoData()).toBe(true)
  })

  it('quitar borra solo el ejemplo y conserva los datos reales', async () => {
    await repo.loadDemoData()
    const real = await repo.createOrder({
      newCustomer: { name: 'Cliente Real' },
      createdDate: '2026-10-10',
      dueDate: '2026-10-30',
      channel: 'otro',
      items: [{ name: 'Algo', quantity: 1, unitPriceCents: 10000 }],
      customization: { details: '', specifications: '', changes: '', internalNotes: '' },
      initialPayment: { amountCents: 2000, date: '2026-10-10', method: 'efectivo' },
    })
    await repo.removeDemoData()
    expect(await repo.hasDemoData()).toBe(false)
    expect(await database.orders.count()).toBe(1)
    expect(await database.customers.count()).toBe(1)
    expect(await database.payments.count()).toBe(1)
    expect((await database.activity.toArray()).every((a) => a.orderId === real.id)).toBe(true)
    const s = await repo.getSettings()
    expect(s.businessName).toBe(DEFAULT_BUSINESS_NAME)
    const stored = await database.orders.get(real.id)
    expect(balanceCents(stored!, await database.payments.toArray())).toBe(8000)
  })

  it('cargar el ejemplo con pedidos reales no cambia el nombre ni la numeración', async () => {
    await repo.updateSettings({ businessName: 'Pasteles Ana' })
    await repo.createOrder({
      newCustomer: { name: 'Cliente Real' },
      createdDate: '2026-10-10',
      dueDate: '2026-10-30',
      channel: 'otro',
      items: [{ name: 'Algo', quantity: 1, unitPriceCents: 10000 }],
      customization: { details: '', specifications: '', changes: '', internalNotes: '' },
    })
    await repo.loadDemoData()
    const s = await repo.getSettings()
    expect(s.businessName).toBe('Pasteles Ana')
    expect(s.nextOrderNumber).toBe(2)
  })

  it('quitar sin datos reales deja la base vacía y el nombre predeterminado', async () => {
    await repo.loadDemoData()
    await repo.removeDemoData()
    const s = await repo.getSettings()
    expect(s.nextOrderNumber).toBe(1)
    expect(s.businessName).toBe(DEFAULT_BUSINESS_NAME)
    expect(await database.orders.count()).toBe(0)
  })
})
