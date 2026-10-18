import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { repo, HiloError } from '../../data/repository'
import type { Customer } from '../../domain/types'
import { customerFormSchema, type CustomerFormValues } from '../../forms/customerForm'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Field'
import { Modal } from '../ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
  /** Si se indica, el diálogo edita ese cliente; si no, crea uno nuevo. */
  customer?: Customer
  /** Se llama tras guardar (o al elegir un cliente existente en caso de duplicado). */
  onSaved?: (customer: Customer) => void
}

export function CustomerFormDialog({ open, onClose, customer, onSaved }: Props) {
  const editing = !!customer
  const [duplicate, setDuplicate] = useState<Customer | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    values: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      notes: customer?.notes ?? '',
    },
  })

  function close() {
    setDuplicate(null)
    reset()
    onClose()
  }

  async function save(values: CustomerFormValues, ignoreDuplicate = false) {
    try {
      if (customer) {
        await repo.updateCustomer(customer.id, values)
        toast.success('Cliente actualizado.')
        onSaved?.({ ...customer, ...values })
      } else {
        if (!ignoreDuplicate) {
          const existing = await repo.findDuplicateCustomer(values.name, values.phone)
          if (existing) {
            setDuplicate(existing)
            return
          }
        }
        const created = await repo.createCustomer(values)
        toast.success(`Cliente «${created.name}» guardado.`)
        onSaved?.(created)
      }
      close()
    } catch (error) {
      toast.error(error instanceof HiloError ? error.message : 'No se pudo guardar el cliente. Inténtalo de nuevo.')
    }
  }

  return (
    <Modal open={open} onClose={close} title={editing ? 'Editar cliente' : 'Nuevo cliente'} description="Solo pedimos lo necesario para atender sus pedidos.">
      <form onSubmit={handleSubmit((v) => save(v))} noValidate className="space-y-4">
        <Input label="Nombre" required autoComplete="off" error={errors.name?.message} {...register('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Teléfono" type="tel" inputMode="tel" autoComplete="off" hint="Opcional" error={errors.phone?.message} {...register('phone')} />
          <Input label="Correo electrónico" type="email" autoComplete="off" hint="Opcional" error={errors.email?.message} {...register('email')} />
        </div>
        <Textarea label="Notas internas" hint="Preferencias, alergias, direcciones de entrega… Solo tú las ves." error={errors.notes?.message} {...register('notes')} />

        {duplicate && (
          <div role="alert" className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-ink">
            <p className="font-medium">Ya existe un cliente parecido: «{duplicate.name}»{duplicate.phone ? ` (${duplicate.phone})` : ''}.</p>
            <p className="mt-1 text-muted">Para no duplicar, puedes usar ese cliente.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onSaved?.(duplicate)
                  close()
                }}
              >
                Usar ese cliente
              </Button>
              <Button size="sm" onClick={handleSubmit((v) => save(v, true))}>
                Crear de todos modos
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button onClick={close}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
