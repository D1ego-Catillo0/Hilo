import { describe, expect, it } from 'vitest'
import { friendlyAuthError } from './errors'

describe('friendlyAuthError', () => {
  it('no revela si el correo existe', () => {
    expect(friendlyAuthError('Invalid login credentials')).toBe('Correo o contraseña incorrectos.')
  })
  it('traduce límite de intentos y errores de red', () => {
    expect(friendlyAuthError('email rate limit exceeded')).toMatch(/Demasiados intentos/)
    expect(friendlyAuthError('Failed to fetch')).toMatch(/conexión/)
  })
  it('usa un mensaje genérico para errores desconocidos', () => {
    expect(friendlyAuthError('algo raro')).toBe('No se pudo iniciar sesión. Inténtalo de nuevo.')
  })
})
