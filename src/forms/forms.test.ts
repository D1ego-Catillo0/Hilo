import { describe, expect, it } from 'vitest'
import { customerFormSchema } from './customerForm'
import { defaultOrderFormValues, orderFormSchema, parseMoneyText, parseOrderForm, parseQuantityText, type OrderFormValues } from './orderForm'

const today = '2026-10-17'

function valid(overrides: Partial<OrderFormValues> = {}): OrderFormValues {
  return {
    ...defaultOrderFormValues(today),
    customerId: 'c1',
    dueDate: '2026-10-25',
    items: [{ name: 'Pastel', description: '', quantity: '2', unitPrice: '450.50' }],
    ...overrides,
  }
}

function errorsOf(values: OrderFormValues): Record<string, string> {
  const result = orderFormSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('importes y cantidades de formulario', () => {
  it('interpreta importes válidos', () => {
    expect(parseMoneyText('1,250.50')).toBe(125050)
    expect(parseMoneyText('$99')).toBe(9900)
    expect(parseMoneyText('0')).toBe(0)
    expect(parseMoneyText('19.9')).toBe(1990)
  })
  it('rechaza importes inválidos', () => {
    expect(parseMoneyText('')).toBeNull()
    expect(parseMoneyText('-5')).toBeNull()
    expect(parseMoneyText('12.345')).toBeNull()
    expect(parseMoneyText('abc')).toBeNull()
  })
  it('las cantidades deben ser mayores a cero', () => {
    expect(parseQuantityText('3')).toBe(3)
    expect(parseQuantityText('1.5')).toBe(1.5)
    expect(parseQuantityText('0')).toBeNull()
    expect(parseQuantityText('-1')).toBeNull()
  })
})

describe('validación del formulario de pedido', () => {
  it('acepta un pedido correcto', () => {
    expect(errorsOf(valid())).toEqual({})
  })
  it('exige cliente', () => {
    expect(errorsOf(valid({ customerId: '' })).customerId).toBeDefined()
  })
  it('con cliente nuevo exige nombre, teléfono y correo válidos', () => {
    const e = errorsOf(valid({ customerMode: 'new', newCustomerName: ' ', newCustomerPhone: '12', newCustomerEmail: 'x' }))
    expect(e.newCustomerName).toBeDefined()
    expect(e.newCustomerPhone).toBeDefined()
    expect(e.newCustomerEmail).toBeDefined()
  })
  it('exige fecha de entrega válida y no anterior a la creación', () => {
    expect(errorsOf(valid({ dueDate: '' })).dueDate).toBeDefined()
    expect(errorsOf(valid({ dueDate: '2026-02-30' })).dueDate).toBeDefined()
    expect(errorsOf(valid({ dueDate: '2026-10-01' })).dueDate).toMatch(/anterior/)
  })
  it('exige al menos un concepto', () => {
    expect(errorsOf(valid({ items: [] })).items).toBeDefined()
  })
  it('valida cada concepto', () => {
    const e = errorsOf(valid({ items: [{ name: '', description: '', quantity: '0', unitPrice: '-3' }] }))
    expect(e['items.0.name']).toBeDefined()
    expect(e['items.0.quantity']).toBeDefined()
    expect(e['items.0.unitPrice']).toMatch(/negativo/)
  })
  it('el anticipo no puede ser negativo ni superar el total', () => {
    expect(errorsOf(valid({ advance: '-10' })).advance).toMatch(/negativo/)
    // total = 2 × 450.50 = 901.00
    expect(errorsOf(valid({ advance: '901.01' })).advance).toMatch(/no puede superar/)
    expect(errorsOf(valid({ advance: '901' }))).toEqual({})
    expect(errorsOf(valid({ advance: '300', advanceDate: '' })).advanceDate).toBeDefined()
  })
})

describe('conversión del formulario', () => {
  it('convierte textos a centavos y arma el anticipo', () => {
    const parsed = parseOrderForm(valid({ advance: '300.25', advanceNote: ' primer pago ' }))
    expect(parsed.items[0]).toMatchObject({ quantity: 2, unitPriceCents: 45050 })
    expect(parsed.initialPayment).toEqual({ amountCents: 30025, date: today, method: 'efectivo', note: 'primer pago' })
    expect(parsed.customerId).toBe('c1')
  })
  it('sin anticipo no genera pago', () => {
    expect(parseOrderForm(valid()).initialPayment).toBeUndefined()
    expect(parseOrderForm(valid({ advance: '0' })).initialPayment).toBeUndefined()
  })
  it('con cliente nuevo no envía customerId', () => {
    const parsed = parseOrderForm(valid({ customerMode: 'new', newCustomerName: ' Ana ', newCustomerPhone: '' }))
    expect(parsed.customerId).toBeUndefined()
    expect(parsed.newCustomer).toEqual({ name: 'Ana', phone: undefined, email: undefined })
  })
})

describe('validación del formulario de cliente', () => {
  const base = { name: 'Ana López', phone: '', email: '', notes: '' }
  it('acepta datos mínimos', () => {
    expect(customerFormSchema.safeParse(base).success).toBe(true)
  })
  it('exige nombre', () => {
    expect(customerFormSchema.safeParse({ ...base, name: '  ' }).success).toBe(false)
  })
  it('valida teléfono y correo solo si se escriben', () => {
    expect(customerFormSchema.safeParse({ ...base, phone: '55 1234 5678', email: 'ana@correo.mx' }).success).toBe(true)
    expect(customerFormSchema.safeParse({ ...base, phone: '123' }).success).toBe(false)
    expect(customerFormSchema.safeParse({ ...base, email: 'ana@' }).success).toBe(false)
  })
})
