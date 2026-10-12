import { Hammer } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'

/**
 * Pantalla temporal para secciones cuya funcionalidad se construye en la siguiente etapa.
 * No contiene datos ficticios ni botones sin acción.
 */
export function PendingSection({ title, stage }: { title: string; stage: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-xl border border-dashed border-line bg-surface p-10 text-center shadow-card">
        <Hammer className="mx-auto text-muted" size={28} aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-ink">Esta sección aún no está construida.</p>
        <p className="mt-1 text-sm text-muted">Se implementa en {stage}.</p>
      </div>
    </>
  )
}
