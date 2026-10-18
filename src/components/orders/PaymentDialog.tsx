import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { HiloError, repo } from '../../data/repository'
import { formatMoney } from '../../domain/money'
import type { OrderView } from '../../domain/orders'
import { PAYMENT_METHOD_LABELS } from '../../domain/types'
import { makePaymentSchema, type PaymentFormValues } from '../../forms/paymentForm'
import { parseMoneyText } from '../../forms/orderForm'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
  view: OrderView
  today: string
}

export function PaymentDialog({ open, onClose, view, today }: Props) {
  const schema = useMemo(() => makePaymentSchema(view.balanceCents), [view.balanceCents])
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    values: { amount: '', date: today, method: 'efectivo', note: '' },
  })

  function close() {
    reset()
    onClose()
  }

  async function save(values: PaymentFormValues) {
    try {
      const amountCents = parseMoneyText(values.amount) ?? 0
      await repo.addPayment(view.order.id, { amountCents, date: values.date, method: values.method, note: values.note })
      toast.success(`Pago de ${formatMoney(amountCents)} registrado.`)
      close()
    } catch (error) {
      toast.error(error instanceof HiloError ? error.message : 'No se pudo registrar el pago. Inténtalo de nuevo.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Registrar pago"
      description={`Pedido #${view.order.number} · Saldo pendiente: ${formatMoney(view.balanceCents)}`}
    >
      <form onSubmit={handleSubmit(save)} noValidate className="space-y-4">
        <Input label="Importe (MXN)" required inputMode="decimal" placeholder="0.00" autoComplete="off" error={errors.amount?.message} {...register('amount')} />
        <div className="-mt-2">
          <Button size="sm" variant="ghost" onClick={() => setValue('amount', (view.balanceCents / 100).toFixed(2), { shouldValidate: true })}>
            Pagar saldo completo ({formatMoney(view.balanceCents)})
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Fecha del pago" type="date" required error={errors.date?.message} {...register('date')} />
          <Select label="Método de pago" {...register('method')}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <Input label="Nota" hint="Opcional. Por ejemplo, «segundo abono»." autoComplete="off" error={errors.note?.message} {...register('note')} />
        <p className="text-xs text-muted">Hilo solo registra pagos: no procesa transferencias, no verifica depósitos bancarios ni realiza cobros.</p>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button onClick={close}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Registrar pago'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
