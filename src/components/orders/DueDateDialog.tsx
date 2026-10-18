import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { HiloError, repo } from '../../data/repository'
import { formatDate } from '../../domain/dates'
import type { Order } from '../../domain/types'
import { dueDateSchema, type DueDateFormValues } from '../../forms/paymentForm'
import { Button } from '../ui/Button'
import { Input } from '../ui/Field'
import { Modal } from '../ui/Modal'

export function DueDateDialog({ open, onClose, order }: { open: boolean; onClose: () => void; order: Order }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DueDateFormValues>({ resolver: zodResolver(dueDateSchema), values: { dueDate: order.dueDate } })

  function close() {
    reset()
    onClose()
  }

  async function save(values: DueDateFormValues) {
    if (values.dueDate === order.dueDate) {
      close()
      return
    }
    try {
      await repo.updateOrder(order.id, { dueDate: values.dueDate })
      toast.success(`Fecha de entrega cambiada al ${formatDate(values.dueDate)}.`)
      close()
    } catch (error) {
      toast.error(error instanceof HiloError ? error.message : 'No se pudo cambiar la fecha. Inténtalo de nuevo.')
    }
  }

  return (
    <Modal open={open} onClose={close} title="Modificar fecha de entrega" description={`Pedido #${order.number} · Fecha actual: ${formatDate(order.dueDate)}`}>
      <form onSubmit={handleSubmit(save)} noValidate className="space-y-4">
        <Input label="Nueva fecha de entrega" type="date" required error={errors.dueDate?.message} {...register('dueDate')} />
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button onClick={close}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar fecha'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
