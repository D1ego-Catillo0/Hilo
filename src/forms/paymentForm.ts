import { z } from 'zod'
import { isValidISODate } from '../domain/dates'
import { formatMoney } from '../domain/money'
import { parseMoneyText } from './orderForm'

/** Esquema del formulario de pago. Depende del saldo pendiente actual del pedido. */
export function makePaymentSchema(balanceCents: number) {
  return z
    .object({
      amount: z.string(),
      date: z.string(),
      method: z.enum(['efectivo', 'transferencia', 'otro']),
      note: z.string(),
    })
    .superRefine((v, ctx) => {
      const add = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
      const cents = parseMoneyText(v.amount)
      if (!v.amount.trim()) add('amount', 'Escribe el importe del pago.')
      else if (cents === null) add('amount', v.amount.trim().startsWith('-') ? 'El pago no puede ser negativo.' : 'Escribe un importe válido, sin signos y con máximo dos decimales.')
      else if (cents === 0) add('amount', 'El pago debe ser mayor a cero.')
      else if (cents > balanceCents) add('amount', `El pago supera el saldo pendiente (${formatMoney(balanceCents)}). Ajusta el importe.`)
      if (!isValidISODate(v.date)) add('date', 'Escribe una fecha de pago válida.')
      if (v.note.length > 300) add('note', 'La nota es demasiado larga (máximo 300 caracteres).')
    })
}

export type PaymentFormValues = z.infer<ReturnType<typeof makePaymentSchema>>

export const dueDateSchema = z.object({
  dueDate: z.string().refine(isValidISODate, 'Escribe una fecha de entrega válida.'),
})

export type DueDateFormValues = z.infer<typeof dueDateSchema>
