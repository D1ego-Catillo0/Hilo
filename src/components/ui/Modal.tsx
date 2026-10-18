import { X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

/**
 * Ventana modal basada en el elemento nativo <dialog>:
 * el navegador gestiona el foco, la tecla Escape y el bloqueo del fondo.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clic en el fondo oscuro (fuera del contenido) cierra la ventana.
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="modal-title"
      className="m-auto w-[min(34rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40"
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-2 -mt-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-app"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

/** Confirmación para acciones destructivas o contradictorias. */
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = 'Volver', danger, onConfirm, onClose }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-ink">{message}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onClose} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm} disabled={pending}>
          {pending ? 'Procesando…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
