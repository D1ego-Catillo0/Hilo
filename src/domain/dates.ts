import { addDays, format, parse, parseISO } from 'date-fns'

export const DEFAULT_TIMEZONE = 'America/Mexico_City'

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria indicada. */
export function todayIn(timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  // El locale "en-CA" produce AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Suma días a una fecha AAAA-MM-DD y devuelve otra AAAA-MM-DD. */
export function addDaysISO(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd')
}

/** Diferencia en días enteros: b - a. */
export function diffDays(a: string, b: string): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Formato visible DD/MM/AAAA. */
export function formatDate(date: string): string {
  if (!isValidISODate(date)) return ''
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = parse(value, 'yyyy-MM-dd', new Date())
  return !Number.isNaN(d.getTime()) && format(d, 'yyyy-MM-dd') === value
}

/** Valida que una zona horaria exista. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('es-MX', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
