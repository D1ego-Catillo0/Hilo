import { describe, expect, it } from 'vitest'
import { addDaysISO, diffDays, formatDate, isValidISODate, todayIn } from './dates'
import { formatMoney, pesosToCents } from './money'
import {
  EMPTY_FILTERS,
  balanceCents,
  buildOrderView,
  checkPayment,
  computeDashboardMetrics,
  filterOrders,
  isOverdue,
  itemAmountCents,
  orderTotalCents,
  sortOrders,
  totalPaidCents,
  transitionNeedsConfirmation,
} from './orders'
import type { Customer, Order, OrderStatus, Payment } from './types'

const customer: Customer = { id: 'c1', name: 'Ana López', phone: '5512345678', createdAt: '2026-10-01T10:00:00Z' }

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    number: 1,
    customerId: 'c1',
    createdDate: '2026-10-01',
    dueDate: '2026-10-20',
    channel: 'whatsapp',
    status: 'pendiente',
    items: [{ id: 'i1', name: 'Pastel de chocolate', quantity: 2, unitPriceCents: 45050 }],
    customization: { details: 'Sin nueces', specifications: '', changes: '', internalNotes: '' },
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    ...overrides,
  }
}

function pay(amountCents: number, id = 'p'): Payment {
  return { id, orderId: 'o1', amountCents, date: '2026-10-02', method: 'efectivo' }
}

describe('dinero', () => {
  it('convierte pesos a centavos sin errores de punto flotante', () => {
    expect(pesosToCents(19.99)).toBe(1999)
    expect(pesosToCents('1,250.50')).toBe(125050)
    expect(pesosToCents(0.1 + 0.2)).toBe(30)
  })
  it('da formato monetario mexicano', () => {
    expect(formatMoney(125050)).toBe('$1,250.50')
  })
})

describe('cálculos de pedido', () => {
  it('calcula el importe de cada concepto', () => {
    expect(itemAmountCents({ quantity: 3, unitPriceCents: 1999 })).toBe(5997)
  })
  it('el total es la suma de los conceptos', () => {
    const order = makeOrder({
      items: [
        { id: 'a', name: 'A', quantity: 2, unitPriceCents: 10000 },
        { id: 'b', name: 'B', quantity: 1, unitPriceCents: 5050 },
      ],
    })
    expect(orderTotalCents(order)).toBe(25050)
  })
  it('acumula pagos parciales y calcula el saldo', () => {
    const order = makeOrder() // total 90100
    const payments = [pay(30000, 'p1'), pay(20000, 'p2')]
    expect(totalPaidCents(payments)).toBe(50000)
    expect(balanceCents(order, payments)).toBe(40100)
  })
  it('saldo es cero cuando está completamente pagado', () => {
    expect(balanceCents(makeOrder(), [pay(90100)])).toBe(0)
  })
})

describe('validación de pagos', () => {
  it('rechaza importes cero o negativos', () => {
    expect(checkPayment(0, 1000)).toEqual({ ok: false, reason: 'no_positivo' })
    expect(checkPayment(-5, 1000)).toEqual({ ok: false, reason: 'no_positivo' })
  })
  it('detecta pagos mayores al saldo', () => {
    expect(checkPayment(1001, 1000)).toEqual({ ok: false, reason: 'excede_saldo' })
  })
  it('acepta pagos iguales o menores al saldo', () => {
    expect(checkPayment(1000, 1000)).toEqual({ ok: true })
    expect(checkPayment(500, 1000)).toEqual({ ok: true })
  })
})

describe('atrasos', () => {
  const today = '2026-10-10'
  it('un pedido activo con entrega pasada está atrasado', () => {
    expect(isOverdue({ status: 'en_preparacion', dueDate: '2026-10-09' }, today)).toBe(true)
  })
  it('entregar hoy no es atraso', () => {
    expect(isOverdue({ status: 'pendiente', dueDate: today }, today)).toBe(false)
  })
  it('entregados y cancelados nunca están atrasados', () => {
    expect(isOverdue({ status: 'entregado', dueDate: '2026-09-01' }, today)).toBe(false)
    expect(isOverdue({ status: 'cancelado', dueDate: '2026-09-01' }, today)).toBe(false)
  })
})

describe('transiciones de estado', () => {
  const cases: [OrderStatus, OrderStatus, boolean][] = [
    ['pendiente', 'confirmado', false],
    ['confirmado', 'en_preparacion', false],
    ['en_preparacion', 'listo', false],
    ['listo', 'entregado', false],
    ['listo', 'en_preparacion', true],
    ['pendiente', 'entregado', true],
    ['pendiente', 'cancelado', true],
    ['cancelado', 'pendiente', true],
    ['entregado', 'listo', true],
    ['pendiente', 'pendiente', false],
  ]
  it.each(cases)('%s → %s requiere confirmación: %s', (from, to, expected) => {
    expect(transitionNeedsConfirmation(from, to)).toBe(expected)
  })
})

describe('filtros, búsqueda y orden', () => {
  const today = '2026-10-10'
  const views = [
    buildOrderView(makeOrder({ id: 'o1', number: 1, dueDate: '2026-10-05', status: 'en_preparacion' }), customer, [pay(10000)]),
    buildOrderView(
      makeOrder({ id: 'o2', number: 2, dueDate: '2026-10-12', status: 'pendiente', items: [{ id: 'x', name: 'Tarjetas', quantity: 100, unitPriceCents: 500 }] }),
      customer,
      [{ ...pay(50000), orderId: 'o2' }],
    ),
    buildOrderView(makeOrder({ id: 'o3', number: 3, dueDate: '2026-10-15', status: 'cancelado' }), { ...customer, id: 'c2', name: 'Pedro Gómez', phone: '5598765432' }, []),
  ]

  it('busca por nombre sin importar acentos ni mayúsculas', () => {
    const r = filterOrders(views, { ...EMPTY_FILTERS, search: 'ana lopez' }, today)
    expect(r.map((v) => v.order.number)).toEqual([1, 2])
  })
  it('busca por teléfono, número de pedido y producto', () => {
    expect(filterOrders(views, { ...EMPTY_FILTERS, search: '5598765432' }, today)).toHaveLength(1)
    expect(filterOrders(views, { ...EMPTY_FILTERS, search: '#2' }, today)[0].order.number).toBe(2)
    expect(filterOrders(views, { ...EMPTY_FILTERS, search: 'tarjetas' }, today)).toHaveLength(1)
  })
  it('filtra atrasados', () => {
    const r = filterOrders(views, { ...EMPTY_FILTERS, onlyOverdue: true }, today)
    expect(r.map((v) => v.order.number)).toEqual([1])
  })
  it('filtra pagos pendientes e ignora cancelados', () => {
    const r = filterOrders(views, { ...EMPTY_FILTERS, onlyPendingBalance: true }, today)
    expect(r.map((v) => v.order.number)).toEqual([1])
  })
  it('filtra por estado y por periodo de entrega', () => {
    expect(filterOrders(views, { ...EMPTY_FILTERS, status: 'cancelado' }, today)).toHaveLength(1)
    expect(filterOrders(views, { ...EMPTY_FILTERS, dueRange: 'semana' }, today).map((v) => v.order.number)).toEqual([2, 3])
  })
  it('ordena por total descendente', () => {
    const r = sortOrders(views, 'total', 'desc')
    // Los pedidos 1 y 3 empatan en total (90,100); el desempate es por número.
    expect(r.map((v) => v.totalCents)).toEqual([90100, 90100, 50000])
    expect(r.map((v) => v.order.number)).toEqual([3, 1, 2])
  })
})

describe('métricas del dashboard', () => {
  it('separa recibido, pendiente y no cuenta pedidos cancelados', () => {
    const today = '2026-10-10'
    const views = [
      buildOrderView(makeOrder({ id: 'o1', dueDate: '2026-10-05', status: 'en_preparacion' }), customer, [pay(30000)]),
      buildOrderView(makeOrder({ id: 'o2', number: 2, dueDate: '2026-10-12', status: 'confirmado' }), customer, [{ ...pay(90100), orderId: 'o2' }]),
      buildOrderView(makeOrder({ id: 'o3', number: 3, status: 'cancelado' }), customer, [{ ...pay(10000), orderId: 'o3' }]),
      buildOrderView(makeOrder({ id: 'o4', number: 4, status: 'entregado' }), customer, [{ ...pay(90100), orderId: 'o4' }]),
    ]
    const m = computeDashboardMetrics(views, today)
    expect(m.activeCount).toBe(2)
    expect(m.overdueCount).toBe(1)
    expect(m.dueSoonCount).toBe(1)
    expect(m.receivedCents).toBe(30000 + 90100 + 90100)
    expect(m.pendingBalanceCents).toBe(60100)
  })
})

describe('fechas', () => {
  it('calcula hoy en la zona horaria configurada', () => {
    // 2026-10-11 03:00 UTC sigue siendo 10 de octubre en Ciudad de México (UTC-6)
    expect(todayIn('America/Mexico_City', new Date('2026-10-11T03:00:00Z'))).toBe('2026-10-10')
  })
  it('suma días y calcula diferencias', () => {
    expect(addDaysISO('2026-10-30', 3)).toBe('2026-11-02')
    expect(diffDays('2026-10-01', '2026-10-11')).toBe(10)
  })
  it('formatea y valida fechas', () => {
    expect(formatDate('2026-10-10')).toBe('10/10/2026')
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-10-10')).toBe(true)
  })
})
