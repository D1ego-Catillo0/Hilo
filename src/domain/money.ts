/** Convierte pesos (número o texto como "1,250.50") a centavos enteros. */
export function pesosToCents(value: number | string): number {
  const n = typeof value === 'string' ? Number(value.replace(/[$,\s]/g, '')) : value
  if (!Number.isFinite(n)) return NaN
  return Math.round(n * 100)
}

export function centsToPesos(cents: number): number {
  return cents / 100
}

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formato monetario mexicano, por ejemplo "$1,250.50". */
export function formatMoney(cents: number): string {
  return mxn.format(cents / 100)
}
