import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { EmptyState, LoadingState, Panel } from '../components/ui/EmptyState'
import { Input, Select, Textarea } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { useCustomers, useOrderView, useToday } from '../data/hooks'
import { HiloError, repo } from '../data/repository'
import { formatMoney } from '../domain/money'
import { itemAmountCents } from '../domain/orders'
import { CHANNEL_LABELS, PAYMENT_METHOD_LABELS, type Customer, type Order } from '../domain/types'
import {
  defaultOrderFormValues,
  emptyItem,
  orderFormSchema,
  orderToFormValues,
  parseMoneyText,
  parseOrderForm,
  parseQuantityText,
  type OrderFormValues,
} from '../forms/orderForm'

/** Página para crear (`/pedidos/nuevo`) o editar (`/pedidos/:id/editar`) un pedido. */
export function OrderFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const customers = useCustomers()
  const today = useToday()
  const view = useOrderView(mode === 'edit' ? id : undefined)

  if (customers === undefined || (mode === 'edit' && view === undefined)) return <LoadingState />

  if (mode === 'edit' && view === null) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="No encontramos este pedido"
        description="Puede que la dirección esté mal escrita o que los datos locales se hayan borrado."
        action={
          <Link to="/pedidos" className={buttonClass('primary')}>
            Ir a pedidos
          </Link>
        }
      />
    )
  }

  const order = mode === 'edit' ? view!.order : undefined
  const preselected = params.get('cliente')
  const initial: OrderFormValues = order
    ? orderToFormValues(order, today)
    : {
        ...defaultOrderFormValues(today),
        customerMode: customers.length === 0 ? 'new' : 'existing',
        customerId: preselected && customers.some((c) => c.id === preselected) ? preselected : '',
      }

  return <OrderForm key={order?.id ?? 'nuevo'} mode={mode} order={order} initial={initial} customers={customers} />
}

interface FormProps {
  mode: 'create' | 'edit'
  order?: Order
  initial: OrderFormValues
  customers: Customer[]
}

function OrderForm({ mode, order, initial, customers }: FormProps) {
  const navigate = useNavigate()
  const [duplicate, setDuplicate] = useState<Customer | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({ resolver: zodResolver(orderFormSchema), defaultValues: initial })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const items = useWatch({ control, name: 'items' })
  const advanceText = useWatch({ control, name: 'advance' })
  const customerMode = useWatch({ control, name: 'customerMode' })

  const totalCents = (items ?? []).reduce((sum, item) => {
    const qty = parseQuantityText(item.quantity)
    const price = parseMoneyText(item.unitPrice)
    return qty !== null && price !== null ? sum + itemAmountCents({ quantity: qty, unitPriceCents: price }) : sum
  }, 0)
  const advanceCents = parseMoneyText(advanceText ?? '') ?? 0
  const balanceCents = totalCents - advanceCents

  async function save(values: OrderFormValues, ignoreDuplicate = false) {
    const parsed = parseOrderForm(values)
    try {
      if (order) {
        const updated = await repo.updateOrder(order.id, {
          customerId: parsed.customerId!,
          createdDate: parsed.createdDate,
          dueDate: parsed.dueDate,
          channel: parsed.channel,
          items: parsed.items.map((i) => ({ ...i, id: crypto.randomUUID() })),
          customization: parsed.customization,
        })
        toast.success(`Pedido #${updated.number} actualizado.`)
        navigate(`/pedidos/${updated.id}`)
        return
      }
      if (parsed.newCustomer && !ignoreDuplicate) {
        const existing = await repo.findDuplicateCustomer(parsed.newCustomer.name, parsed.newCustomer.phone)
        if (existing) {
          setDuplicate(existing)
          return
        }
      }
      const created = await repo.createOrder(parsed)
      toast.success(`Pedido #${created.number} guardado.`)
      navigate(`/pedidos/${created.id}`)
    } catch (error) {
      toast.error(error instanceof HiloError ? error.message : 'No se pudo guardar el pedido. Revisa los datos e inténtalo de nuevo.')
    }
  }

  const itemsRootError = errors.items?.message ?? errors.items?.root?.message

  return (
    <>
      <Link to={order ? `/pedidos/${order.id}` : '/pedidos'} className="mb-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        {order ? `Pedido #${order.number}` : 'Pedidos'}
      </Link>
      <PageHeader
        title={order ? `Editar pedido #${order.number}` : 'Nuevo pedido'}
        description={order ? 'Los pagos ya registrados no se modifican al editar el pedido.' : 'El número de pedido se asigna automáticamente al guardar.'}
      />

      <form onSubmit={handleSubmit((v) => save(v))} noValidate className="space-y-5 pb-28">
        {/* 1. Información básica */}
        <Panel title="Información básica">
          <div className="space-y-4">
            {!order && (
              <div role="group" aria-label="Tipo de cliente" className="inline-flex rounded-lg border border-line bg-app p-1">
                {(
                  [
                    ['existing', 'Cliente existente'],
                    ['new', 'Cliente nuevo'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={customerMode === value}
                    disabled={value === 'existing' && customers.length === 0}
                    onClick={() => {
                      setValue('customerMode', value)
                      setDuplicate(null)
                    }}
                    className={`min-h-10 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      customerMode === value ? 'bg-surface text-brand shadow-card' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {customerMode === 'existing' ? (
              <Select label="Cliente" required error={errors.customerId?.message} {...register('customerId')}>
                <option value="">Selecciona un cliente…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Nombre del cliente" required autoComplete="off" error={errors.newCustomerName?.message} {...register('newCustomerName')} />
                <Input label="Teléfono" type="tel" inputMode="tel" autoComplete="off" hint="Opcional" error={errors.newCustomerPhone?.message} {...register('newCustomerPhone')} />
                <Input label="Correo electrónico" type="email" autoComplete="off" hint="Opcional" error={errors.newCustomerEmail?.message} {...register('newCustomerEmail')} />
              </div>
            )}

            {duplicate && (
              <div role="alert" className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-ink">
                <p className="font-medium">
                  Ya existe un cliente parecido: «{duplicate.name}»{duplicate.phone ? ` (${duplicate.phone})` : ''}.
                </p>
                <p className="mt-1 text-muted">Para no duplicar clientes, te recomendamos usar ese.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setValue('customerMode', 'existing')
                      setValue('customerId', duplicate.id)
                      setDuplicate(null)
                    }}
                  >
                    Usar ese cliente
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setDuplicate(null)
                      void handleSubmit((v) => save(v, true))()
                    }}
                  >
                    Crear de todos modos
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Fecha de creación" type="date" required error={errors.createdDate?.message} {...register('createdDate')} />
              <Input label="Fecha de entrega" type="date" required error={errors.dueDate?.message} {...register('dueDate')} />
              <Select label="Canal de origen" error={errors.channel?.message} {...register('channel')}>
                {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Panel>

        {/* 2. Conceptos */}
        <Panel
          title="Productos o servicios"
          action={
            <Button size="sm" onClick={() => append(emptyItem())}>
              <Plus size={16} aria-hidden="true" />
              Agregar concepto
            </Button>
          }
        >
          <ul className="space-y-5">
            {fields.map((field, index) => {
              const rowErrors = errors.items?.[index]
              const qty = parseQuantityText(items?.[index]?.quantity ?? '')
              const price = parseMoneyText(items?.[index]?.unitPrice ?? '')
              const amount = qty !== null && price !== null ? formatMoney(itemAmountCents({ quantity: qty, unitPriceCents: price })) : '—'
              return (
                <li key={field.id} className="rounded-lg border border-line p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">Concepto {index + 1}</p>
                    <Button size="sm" variant="ghost" onClick={() => remove(index)} disabled={fields.length === 1} aria-label={`Eliminar concepto ${index + 1}`}>
                      <Trash2 size={16} aria-hidden="true" />
                      Quitar
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <Input label="Nombre" required autoComplete="off" error={rowErrors?.name?.message} {...register(`items.${index}.name` as const)} />
                    </div>
                    <div className="sm:col-span-3">
                      <Input label="Descripción" hint="Opcional" autoComplete="off" {...register(`items.${index}.description` as const)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Input label="Cantidad" required inputMode="decimal" error={rowErrors?.quantity?.message} {...register(`items.${index}.quantity` as const)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Input label="Precio unitario (MXN)" required inputMode="decimal" placeholder="0.00" error={rowErrors?.unitPrice?.message} {...register(`items.${index}.unitPrice` as const)} />
                    </div>
                    <div className="sm:col-span-2">
                      <p className="mb-1.5 text-sm font-medium text-ink">Importe</p>
                      <p className="flex min-h-11 items-center rounded-lg bg-app px-3 text-sm font-semibold tabular-nums" aria-live="polite">
                        {amount}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {itemsRootError && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {itemsRootError}
            </p>
          )}
        </Panel>

        {/* 3. Personalización */}
        <Panel title="Personalización">
          <p className="mb-4 text-sm text-muted">Llena solo lo que aplique a tu negocio. Todo es opcional.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Textarea label="Descripción detallada del encargo" {...register('details')} />
            </div>
            <Textarea label="Especificaciones" hint="Colores, medidas, materiales, sabores…" {...register('specifications')} />
            <Textarea label="Cambios solicitados" {...register('changes')} />
            <div className="sm:col-span-2">
              <Textarea label="Notas internas" hint="Solo tú las ves." {...register('internalNotes')} />
            </div>
          </div>
        </Panel>

        {/* 4. Pagos */}
        {!order ? (
          <Panel title="Anticipo">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Anticipo (MXN)" inputMode="decimal" placeholder="0.00" hint="Opcional. Se guarda como el primer pago del pedido." error={errors.advance?.message} {...register('advance')} />
              <Input label="Fecha del anticipo" type="date" error={errors.advanceDate?.message} {...register('advanceDate')} />
              <Select label="Método de pago" {...register('advanceMethod')}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input label="Nota sobre el pago" hint="Opcional" autoComplete="off" {...register('advanceNote')} />
            </div>
            <p className="mt-4 text-xs text-muted">Hilo solo registra pagos: no procesa transferencias, no verifica depósitos bancarios ni realiza cobros.</p>
          </Panel>
        ) : (
          <p className="rounded-xl border border-line bg-surface px-5 py-4 text-sm text-muted shadow-card">
            Los pagos se registran desde el detalle del pedido, para conservar siempre su historial.
          </p>
        )}

        {/* Barra inferior con totales */}
        <div className="no-print fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <dl className="flex gap-5 text-sm" aria-live="polite">
              <div>
                <dt className="text-xs text-muted">Total</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(totalCents)}</dd>
              </div>
              {!order && (
                <>
                  <div>
                    <dt className="text-xs text-muted">Anticipo</dt>
                    <dd className="font-semibold tabular-nums">{formatMoney(advanceCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Saldo pendiente</dt>
                    <dd className="font-semibold tabular-nums">{formatMoney(Math.max(balanceCents, 0))}</dd>
                  </div>
                </>
              )}
            </dl>
            <div className="flex gap-2">
              <Link to={order ? `/pedidos/${order.id}` : '/pedidos'} className={buttonClass('secondary')}>
                Cancelar
              </Link>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando…' : order ? 'Guardar cambios' : mode === 'create' ? 'Guardar pedido' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
