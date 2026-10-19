import { addDaysISO } from '../domain/dates'
import type { ActivityEvent, Customer, Order, OrderStatus, Payment } from '../domain/types'

/**
 * Datos de demostración del "Taller de Ejemplo".
 * - Todo es ficticio: nombres genéricos y teléfonos que no existen.
 * - Todos los registros llevan `isDemo: true` para poder mostrarlos como ejemplo y borrarlos
 *   sin tocar datos reales.
 * - Las fechas son relativas a "hoy" para que el Inicio sea útil la primera vez que se abre.
 * - Los números de pedido empiezan en 9001 para no mezclarse con la numeración real.
 * - Los identificadores son fijos: cargar el ejemplo dos veces no duplica nada.
 */

export const DEMO_BUSINESS_NAME = 'Taller de Ejemplo'
export const DEFAULT_BUSINESS_NAME = 'Mi negocio'
export const DEMO_FIRST_ORDER_NUMBER = 9001

export interface DemoData {
  customers: Customer[]
  orders: Order[]
  payments: Payment[]
  activity: ActivityEvent[]
}

const stamp = (date: string, hour: number) => `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`

const money = (pesos: number) => `$${pesos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function buildDemoData(today: string): DemoData {
  const d = (offset: number) => addDaysISO(today, offset)

  const customers: Customer[] = [
    { id: 'demo-c1', name: 'Laura Mendoza', phone: '55 0000 0101', notes: 'Cliente de ejemplo. Prefiere que le avisen por WhatsApp.', createdAt: stamp(d(-30), 15), isDemo: true },
    { id: 'demo-c2', name: 'Carlos Ibarra', phone: '55 0000 0102', createdAt: stamp(d(-25), 15), isDemo: true },
    { id: 'demo-c3', name: 'Sofía Ramírez', phone: '55 0000 0103', email: 'sofia@ejemplo.invalid', createdAt: stamp(d(-20), 15), isDemo: true },
    { id: 'demo-c4', name: 'Miguel Torres', phone: '55 0000 0104', createdAt: stamp(d(-15), 15), isDemo: true },
    { id: 'demo-c5', name: 'Daniela Vega', phone: '55 0000 0105', createdAt: stamp(d(-12), 15), isDemo: true },
    { id: 'demo-c6', name: 'Roberto Núñez', phone: '55 0000 0106', createdAt: stamp(d(-10), 15), isDemo: true },
  ]

  interface Spec {
    customerId: string
    channel: Order['channel']
    created: number
    due: number
    status: OrderStatus
    items: [string, number, number][] // nombre, cantidad, precio unitario en pesos
    details: string
    payments: [number, number][] // [día relativo a hoy, importe en pesos]
  }

  // Cubre: pendiente, en preparación, listo, entregado, atrasado, anticipo parcial, pagado completo y cancelado.
  const specs: Spec[] = [
    { customerId: 'demo-c1', channel: 'whatsapp', created: -1, due: 9, status: 'pendiente', items: [['Pastel de cumpleaños', 1, 850], ['Cupcakes decorados', 12, 30]], details: 'Pastel de chocolate con tema de dinosaurios. Sin nueces.', payments: [] },
    { customerId: 'demo-c2', channel: 'instagram', created: -6, due: 3, status: 'en_preparacion', items: [['Playeras personalizadas', 20, 180]], details: 'Logo al frente, tallas surtidas. Tela color azul marino.', payments: [[-6, 1800]] },
    { customerId: 'demo-c3', channel: 'presencial', created: -5, due: 1, status: 'listo', items: [['Arreglo floral grande', 1, 1200]], details: 'Girasoles y listón amarillo. Entregar con tarjeta.', payments: [[-5, 600], [-1, 600]] },
    { customerId: 'demo-c4', channel: 'telefono', created: -14, due: -6, status: 'entregado', items: [['Tarjetas de presentación', 500, 2.4]], details: 'Papel couché, acabado mate.', payments: [[-14, 600], [-6, 600]] },
    { customerId: 'demo-c5', channel: 'whatsapp', created: -11, due: -2, status: 'en_preparacion', items: [['Mesa de dulces', 1, 2800]], details: 'Temática de unicornios para 25 niños. Atrasado: falta el pastel central.', payments: [[-11, 1000]] },
    { customerId: 'demo-c6', channel: 'otro', created: -3, due: 6, status: 'confirmado', items: [['Caja de regalo personalizada', 4, 350]], details: 'Incluye taza grabada y tarjeta con nombre.', payments: [[-3, 700]] },
    { customerId: 'demo-c1', channel: 'instagram', created: -4, due: 5, status: 'en_preparacion', items: [['Invitaciones impresas', 40, 25]], details: 'Diseño enviado por correo. Sobres blancos.', payments: [[-4, 1000]] },
    { customerId: 'demo-c3', channel: 'whatsapp', created: -9, due: 2, status: 'cancelado', items: [['Pastel de boda', 1, 3200]], details: 'El cliente canceló el evento. Se conserva en el historial.', payments: [] },
  ]

  const orders: Order[] = []
  const payments: Payment[] = []
  const activity: ActivityEvent[] = []

  specs.forEach((s, index) => {
    const id = `demo-o${index + 1}`
    const number = DEMO_FIRST_ORDER_NUMBER + index
    const created = d(s.created)
    orders.push({
      id,
      number,
      customerId: s.customerId,
      createdDate: created,
      dueDate: d(s.due),
      channel: s.channel,
      status: s.status,
      items: s.items.map(([name, quantity, price], i) => ({ id: `${id}-i${i + 1}`, name, quantity, unitPriceCents: Math.round(price * 100) })),
      customization: { details: s.details, specifications: '', changes: '', internalNotes: '' },
      createdAt: stamp(created, 15),
      updatedAt: stamp(created, 15),
      isDemo: true,
    })
    const customerName = customers.find((c) => c.id === s.customerId)?.name ?? 'cliente'
    activity.push({ id: `${id}-a1`, orderId: id, type: 'pedido_creado', message: `Pedido #${number} creado para ${customerName}.`, createdAt: stamp(created, 15), isDemo: true })

    s.payments.forEach(([day, amount], i) => {
      payments.push({ id: `${id}-p${i + 1}`, orderId: id, amountCents: Math.round(amount * 100), date: d(day), method: i % 2 === 0 ? 'efectivo' : 'transferencia', isDemo: true })
      activity.push({
        id: `${id}-ap${i + 1}`,
        orderId: id,
        type: 'pago_registrado',
        message: `${i === 0 ? 'Anticipo' : 'Pago'} de ${money(amount)} registrado.`,
        createdAt: stamp(d(day), 16),
        isDemo: true,
      })
    })

    if (s.status === 'entregado') {
      activity.push({ id: `${id}-a9`, orderId: id, type: 'pedido_entregado', message: 'Pedido marcado como entregado.', createdAt: stamp(d(s.due), 18), isDemo: true })
    } else if (s.status === 'cancelado') {
      activity.push({ id: `${id}-a9`, orderId: id, type: 'pedido_cancelado', message: 'Pedido cancelado. Se conserva en el historial.', createdAt: stamp(d(-2), 12), isDemo: true })
    } else if (s.status !== 'pendiente') {
      activity.push({ id: `${id}-a9`, orderId: id, type: 'estado_actualizado', message: 'Estado actualizado.', createdAt: stamp(d(Math.min(s.created + 2, 0)), 14), isDemo: true })
    }
  })

  return { customers, orders, payments, activity }
}
