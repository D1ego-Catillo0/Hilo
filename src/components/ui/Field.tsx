import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const controlBase =
  'block w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-muted/70 disabled:bg-app disabled:text-muted'

function controlClass(hasError: boolean, extra = ''): string {
  return `${controlBase} ${hasError ? 'border-danger' : 'border-line'} ${extra}`
}

interface FieldShellProps {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}

function FieldShell({ id, label, required, error, hint, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

interface CommonProps {
  label: string
  error?: string
  hint?: string
}

/** Campo de texto con etiqueta, ayuda y mensaje de error asociados (accesible). Compatible con register() de React Hook Form. */
export function Input({ label, error, hint, required, className = '', ...props }: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(!!error, `min-h-11 ${className}`)}
        {...props}
      />
    </FieldShell>
  )
}

export function Select({
  label,
  error,
  hint,
  required,
  className = '',
  children,
  ...props
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(!!error, `min-h-11 ${className}`)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}

export function Textarea({ label, error, hint, required, className = '', ...props }: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(!!error, `py-2 ${className}`)}
        rows={3}
        {...props}
      />
    </FieldShell>
  )
}
