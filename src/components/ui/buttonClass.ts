export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm'

/** Clases de botón reutilizables; también sirven para enlaces con aspecto de botón (<Link className={buttonClass()}>). */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md'): string {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  const sizes = size === 'md' ? 'min-h-11 px-4 text-sm' : 'min-h-9 px-3 text-sm'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand text-white shadow-card hover:brightness-110',
    secondary: 'border border-line bg-surface text-ink hover:bg-app',
    danger: 'bg-danger text-white shadow-card hover:brightness-110',
    ghost: 'text-muted hover:bg-app hover:text-ink',
  }
  return `${base} ${sizes} ${variants[variant]}`
}
