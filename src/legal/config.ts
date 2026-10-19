/**
 * Datos del responsable que aparecen en los avisos legales.
 * Rellena estos campos UNA vez; todas las páginas legales se actualizan solas.
 * Mientras tengan corchetes, las páginas muestran el campo como pendiente.
 */
export const LEGAL = {
  /** Nombre completo de la persona física o razón social que opera Hilo. */
  responsable: '[Nombre completo o razón social del responsable]',
  /** Domicilio para oír y recibir notificaciones (exigido por la LFPDPPP). */
  domicilio: '[Domicilio del responsable]',
  /** Correo para ejercer derechos ARCO y para contacto legal. */
  correo: '[correo de contacto]',
  /** Año de inicio, para el aviso de derechos de autor. */
  anioInicio: 2026,
  /** Fecha de la última actualización de los textos (AAAA-MM-DD). */
  actualizado: '2026-10-19',
  /** Versión del texto: súbela cuando cambies algo importante para volver a pedir consentimiento. */
  version: '1.0',
} as const

export const isPending = (value: string) => value.startsWith('[')
