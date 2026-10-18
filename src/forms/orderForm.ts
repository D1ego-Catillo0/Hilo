import { z } from 'zod'
import { isValidISODate } from '../domain/dates'
import { formatMoney, pesosToCents } from '../domain/money'
import { itemAmountCents } from '../domain/orders'
import type { Channel, Customization, Order, PaymentMethod } from '../domain/types'

/*
 * Formulario de pedido.
 * Todos los valores del formulario son TEXTO (así es como los entrega un <input>);
 * la conversión a números/centavos se hace aquí, en un solo lugar.
 */

/** Convierte "1,250.50" o "$99" a centavos. Devuelve null si no es un importe válido (sin signos, máx. 2 decimales). */
export function parseMoneyText(text: string): number | null {
  const clean = text.trim().replace(/[$,\s]/g, '')
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(clean)) return null
  return pesosToCents(clean)
}

/** Cantidad positiva, hasta 3 decimales (por ejemplo 1.5 kg). Devuelve null si no es válida. */
export function parseQuantityText(text: string): number | null {
  const clean = text.trim().replace(/,/g, '')
  if (!/^\d{1,7}(\.\d{1,3})?$/.test(clean)) return null
  const n = Number(clean)
  return n > 0 ? n : null
}

const MONEY_ERROR = 'Escribe un importe válido, sin signos y con máximo dos decimales.'

const itemSchema = z.object({
  name: z.string(),
  description: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
})

export const orderFormSchema = z
  .object({
    customerMode: z.enum(['existing', 'new']),
    customerId: z.string(),
    newCustomerName: z.string(),
    newCustomerPhone: z.string(),
    newCustomerEmail: z.string(),
    createdDate: z.string(),
    dueDate: z.string(),
    channel: z.enum(['whatsapp', 'instagram', 'presencial', 'telefono', 'otro']),
    items: z.array(itemSchema),
    details: z.string(),
    specifications: z.string(),
    changes: z.string(),
    internalNotes: z.string(),
    advance: z.string(),
    advanceDate: z.string(),
    advanceMethod: z.enum(['efectivo', 'transferencia', 'otro']),
    advanceNote: z.string(),
  })
  .superRefine((v, ctx) => {
    const add = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })

    // Cliente
    if (v.customerMode === 'existing') {
      if (!v.customerId) add(['customerId'], 'Selecciona un cliente o crea uno nuevo.')
    } else {
      if (!v.newCustomerName.trim()) add(['newCustomerName'], 'Escribe el nombre del cliente.')
      const digits = v.newCustomerPhone.replace(/\D/g, '')
      if (v.newCustomerPhone.trim() && (digits.length < 7 || digits.length > 15)) add(['newCustomerPhone'], 'Escribe un teléfono válido (de 7 a 15 dígitos).')
      if (v.newCustomerEmail.trim() && !z.email().safeParse(v.newCustomerEmail.trim()).success) add(['newCustomerEmail'], 'Escribe un correo electrónico válido.')
    }

    // Fechas
    if (!isValidISODate(v.createdDate)) add(['createdDate'], 'Escribe una fecha de creación válida.')
    if (!isValidISODate(v.dueDate)) add(['dueDate'], 'Escribe una fecha de entrega válida.')
    else if (isValidISODate(v.createdDate) && v.dueDate < v.createdDate) add(['dueDate'], 'La fecha de entrega no puede ser anterior a la fecha de creación.')

    // Conceptos
    if (v.items.length === 0) add(['items'], 'Agrega al menos un concepto al pedido.')
    let totalCents = 0
    let totalIsKnown = v.items.length > 0
    v.items.forEach((item, i) => {
      if (!item.name.trim()) add(['items', i, 'name'], 'Escribe el nombre del concepto.')
      const qty = parseQuantityText(item.quantity)
      if (qty === null) add(['items', i, 'quantity'], 'La cantidad debe ser mayor a cero.')
      const price = parseMoneyText(item.unitPrice)
      if (price === null) add(['items', i, 'unitPrice'], item.unitPrice.trim().startsWith('-') ? 'El precio no puede ser negativo.' : MONEY_ERROR)
      if (qty !== null && price !== null) totalCents += itemAmountCents({ quantity: qty, unitPriceCents: price })
      else totalIsKnown = false
    })

    // Anticipo
    if (v.advance.trim()) {
      const advance = parseMoneyText(v.advance)
      if (advance === null) {
        add(['advance'], v.advance.trim().startsWith('-') ? 'El anticipo no puede ser negativo.' : MONEY_ERROR)
      } else {
        if (advance > 0 && !isValidISODate(v.advanceDate)) add(['advanceDate'], 'Escribe la fecha del anticipo.')
        if (totalIsKnown && advance > totalCents) {
          add(['advance'], `El anticipo no puede superar el total del pedido (${formatMoney(totalCents)}). Corrige el importe.`)
        }
      }
    }
  })

export type OrderFormValues = z.infer<typeof orderFormSchema>

export function emptyItem(): OrderFormValues['items'][number] {
  return { name: '', description: '', quantity: '1', unitPrice: '' }
}

export function defaultOrderFormValues(today: string): OrderFormValues {
  return {
    customerMode: 'existing',
    customerId: '',
    newCustomerName: '',
    newCustomerPhone: '',
    newCustomerEmail: '',
    createdDate: today,
    dueDate: '',
    channel: 'whatsapp',
    items: [emptyItem()],
    details: '',
    specifications: '',
    changes: '',
    internalNotes: '',
    advance: '',
    advanceDate: today,
    advanceMethod: 'efectivo',
    advanceNote: '',
  }
}

/** Valores del formulario a partir de un pedido existente (modo edición; no incluye pagos). */
export function orderToFormValues(order: Order, today: string): OrderFormValues {
  return {
    ...defaultOrderFormValues(today),
    customerId: order.customerId,
    createdDate: order.createdDate,
    dueDate: order.dueDate,
    channel: order.channel,
    items: order.items.map((i) => ({
      name: i.name,
      description: i.description ?? '',
      quantity: String(i.quantity),
      unitPrice: (i.unitPriceCents / 100).toFixed(2),
    })),
    details: order.customization.details,
    specifications: order.customization.specifications,
    changes: order.customization.changes,
    internalNotes: order.customization.internalNotes,
  }
}

export interface ParsedOrderForm {
  customerId?: string
  newCustomer?: { name: string; phone?: string; email?: string }
  createdDate: string
  dueDate: string
  channel: Channel
  items: { name: string; description?: string; quantity: number; unitPriceCents: number }[]
  customization: Customization
  initialPayment?: { amountCents: number; date: string; method: PaymentMethod; note?: string }
}

/** Convierte valores YA VALIDADOS en los datos que espera el repositorio (importes en centavos). */
export function parseOrderForm(v: OrderFormValues): ParsedOrderForm {
  const advanceCents = v.advance.trim() ? (parseMoneyText(v.advance) ?? 0) : 0
  return {
    ...(v.customerMode === 'existing'
      ? { customerId: v.customerId }
      : { newCustomer: { name: v.newCustomerName.trim(), phone: v.newCustomerPhone.trim() || undefined, email: v.newCustomerEmail.trim() || undefined } }),
    createdDate: v.createdDate,
    dueDate: v.dueDate,
    channel: v.channel,
    items: v.items.map((i) => ({
      name: i.name.trim(),
      description: i.description.trim() || undefined,
      quantity: parseQuantityText(i.quantity) ?? 0,
      unitPriceCents: parseMoneyText(i.unitPrice) ?? 0,
    })),
    customization: {
      details: v.details.trim(),
      specifications: v.specifications.trim(),
      changes: v.changes.trim(),
      internalNotes: v.internalNotes.trim(),
    },
    ...(advanceCents > 0
      ? { initialPayment: { amountCents: advanceCents, date: v.advanceDate, method: v.advanceMethod, note: v.advanceNote.trim() || undefined } }
      : {}),
  }
}
