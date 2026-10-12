import Dexie, { type Table } from 'dexie'
import type { ActivityEvent, BusinessSettings, Customer, Order, Payment } from '../domain/types'

/**
 * Base de datos local (IndexedDB) de Hilo, mediante Dexie.
 * Los datos viven solo en este navegador y este dispositivo.
 *
 * Para migrar a un backend en el futuro, la interfaz solo debería hablar con
 * `repository.ts`; esa es la capa que se reemplazaría por llamadas a una API.
 */
export class HiloDB extends Dexie {
  customers!: Table<Customer, string>
  orders!: Table<Order, string>
  payments!: Table<Payment, string>
  activity!: Table<ActivityEvent, string>
  settings!: Table<BusinessSettings, string>

  constructor(name = 'hilo') {
    super(name)
    this.version(1).stores({
      customers: 'id, name, phone',
      orders: 'id, number, customerId, dueDate, status',
      payments: 'id, orderId, date',
      activity: 'id, orderId, createdAt',
      settings: 'id',
    })
  }
}

export const db = new HiloDB()
