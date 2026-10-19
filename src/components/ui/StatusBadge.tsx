import { Ban, CheckCircle2, Clock, Hammer, PackageCheck, ThumbsUp, TriangleAlert, type LucideIcon } from 'lucide-react'
import { STATUS_LABELS, type OrderStatus } from '../../domain/types'

const STYLES: Record<OrderStatus, { icon: LucideIcon; className: string }> = {
  pendiente: { icon: Clock, className: 'bg-app text-muted border-line' },
  confirmado: { icon: ThumbsUp, className: 'bg-brand-soft text-brand border-brand/20' },
  en_preparacion: { icon: Hammer, className: 'bg-brand-soft text-brand border-brand/20' },
  listo: { icon: PackageCheck, className: 'bg-success-soft text-success border-success/20' },
  entregado: { icon: CheckCircle2, className: 'bg-success-soft text-success border-success/20' },
  cancelado: { icon: Ban, className: 'bg-app text-muted border-line line-through' },
}

const baseClass = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold'

/** Etiqueta de estado de producción. Siempre lleva icono y texto (no depende solo del color). */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const { icon: Icon, className } = STYLES[status]
  return (
    <span className={`${baseClass} ${className}`}>
      <Icon size={13} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}

/** Etiqueta roja que indica que el pedido está atrasado. */
export function OverdueBadge() {
  return (
    <span className={`${baseClass} border-danger/20 bg-danger-soft text-danger`}>
      <TriangleAlert size={13} aria-hidden="true" />
      Atrasado
    </span>
  )
}

/** Etiqueta ámbar para entregas próximas. */
export function DueSoonBadge() {
  return (
    <span className={`${baseClass} border-warning/20 bg-warning-soft text-warning`}>
      <Clock size={13} aria-hidden="true" />
      Entrega próxima
    </span>
  )
}

export function PaidBadge() {
  return (
    <span className={`${baseClass} border-success/20 bg-success-soft text-success`}>
      <CheckCircle2 size={13} aria-hidden="true" />
      Pagado
    </span>
  )
}

/** Marca los registros de demostración para que nunca se confundan con datos reales. */
export function DemoBadge() {
  return <span className="inline-flex items-center rounded-full border border-line bg-app px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Ejemplo</span>
}
