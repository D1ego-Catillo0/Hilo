/** Logotipo tipográfico de Hilo con un símbolo geométrico: puntos conectados por líneas (seguimiento). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--hilo-primary)" />
      <circle cx="10" cy="9" r="2.5" fill="#fff" />
      <circle cx="10" cy="16" r="2.5" fill="#fff" />
      <circle cx="10" cy="23" r="2.5" fill="#fff" />
      <path d="M15.5 9h8M15.5 16h8M15.5 23h5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight text-ink">Hilo</span>
    </span>
  )
}
