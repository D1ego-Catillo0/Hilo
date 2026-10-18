import { Plus, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CustomerFormDialog } from '../components/customers/CustomerFormDialog'
import { Button } from '../components/ui/Button'
import { EmptyState, LoadingState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useCustomers, useOrderViews } from '../data/hooks'
import { formatMoney } from '../domain/money'
import { isActive } from '../domain/orders'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function CustomersPage() {
  const customers = useCustomers()
  const views = useOrderViews()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const stats = useMemo(() => {
    const map = new Map<string, { active: number; balanceCents: number }>()
    for (const v of views ?? []) {
      const s = map.get(v.order.customerId) ?? { active: 0, balanceCents: 0 }
      if (isActive(v.order)) s.active += 1
      if (v.order.status !== 'cancelado') s.balanceCents += Math.max(v.balanceCents, 0)
      map.set(v.order.customerId, s)
    }
    return map
  }, [views])

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return customers ?? []
    return (customers ?? []).filter((c) => normalize(`${c.name} ${c.phone ?? ''} ${c.email ?? ''} ${c.notes ?? ''}`).includes(q))
  }, [customers, query])

  const newButton = (
    <Button variant="primary" onClick={() => setCreating(true)}>
      <Plus size={18} aria-hidden="true" />
      Nuevo cliente
    </Button>
  )

  return (
    <>
      <PageHeader title="Clientes" description="Las personas que te hacen pedidos y todo lo que tienen contigo." actions={customers && customers.length > 0 ? newButton : undefined} />

      {customers === undefined || views === undefined ? (
        <LoadingState />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no tienes clientes"
          description="Agrega a tu primer cliente para empezar a registrar sus pedidos. También puedes crearlo directamente al hacer un pedido."
          action={newButton}
        />
      ) : (
        <>
          <div className="relative mb-4 max-w-md">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar clientes"
              placeholder="Buscar por nombre, teléfono o correo"
              className="block min-h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-sm placeholder:text-muted/70"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-sm text-muted shadow-card">
              Ningún cliente coincide con «{query}».
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              {filtered.map((c) => {
                const s = stats.get(c.id)
                return (
                  <li key={c.id}>
                    <Link to={`/clientes/${c.id}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4 hover:bg-app/60">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{c.name}</p>
                        <p className="truncate text-sm text-muted">{[c.phone, c.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div>
                          <p className="text-xs text-muted">Pedidos activos</p>
                          <p className="font-semibold tabular-nums">{s?.active ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">Saldo pendiente</p>
                          <p className="font-semibold tabular-nums">{formatMoney(s?.balanceCents ?? 0)}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <CustomerFormDialog open={creating} onClose={() => setCreating(false)} onSaved={(c) => navigate(`/clientes/${c.id}`)} />
    </>
  )
}
