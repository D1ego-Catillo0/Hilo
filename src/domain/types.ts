/**
 * Modelos de datos de Hilo.
 *
 * Decisiones técnicas:
 * - Los importes se guardan en CENTAVOS (enteros) para evitar errores de redondeo
 *   con decimales. La interfaz convierte de/hacia pesos.
 * - Las fechas de entrega/creación/pago se guardan como texto "AAAA-MM-DD" (sin hora),
 *   para que no cambien por zonas horarias.
 * - Los totales, pagos acumulados y saldos NO se guardan: se calculan siempre a partir
 *   de los conceptos y los pagos (ver orders.ts).
 */

export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'entregado'
  | 'cancelado'

export type Channel = 'whatsapp' | 'instagram' | 'presencial' | 'telefono' | 'otro'

export type PaymentMethod = 'efectivo' | 'transferencia' | 'otro'

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  notes?: string
  createdAt: string // ISO con hora
  isDemo?: boolean
}

export interface OrderItem {
  id: string
  name: string
  description?: string
  quantity: number
  unitPriceCents: number
}

export interface Customization {
  details: string
  specifications: string
  changes: string
  internalNotes: string
}

export interface Order {
  id: string
  number: number
  customerId: string
  createdDate: string // AAAA-MM-DD
  dueDate: string // AAAA-MM-DD
  channel: Channel
  status: OrderStatus
  items: OrderItem[]
  customization: Customization
  createdAt: string // ISO con hora
  updatedAt: string // ISO con hora
  isDemo?: boolean
}

export interface Payment {
  id: string
  orderId: string
  amountCents: number
  date: string // AAAA-MM-DD
  method: PaymentMethod
  note?: string
  isDemo?: boolean
}

export type ActivityType =
  | 'pedido_creado'
  | 'pedido_editado'
  | 'estado_actualizado'
  | 'pago_registrado'
  | 'entrega_modificada'
  | 'pedido_entregado'
  | 'pedido_cancelado'

export interface ActivityEvent {
  id: string
  orderId: string
  type: ActivityType
  message: string
  createdAt: string // ISO con hora
  isDemo?: boolean
}

export interface BusinessSettings {
  id: 'settings'
  businessName: string
  currency: 'MXN'
  timezone: string
  dateFormat: 'DD/MM/AAAA'
  nextOrderNumber: number
  /** Indica si el usuario ya decidió sobre los datos de demostración. */
  demoPromptHandled: boolean
}

export const ORDER_STATUSES: OrderStatus[] = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo',
  'entregado',
  'cancelado',
]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo para entregar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  presencial: 'Presencial',
  telefono: 'Teléfono',
  otro: 'Otro',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  otro: 'Otro',
}
