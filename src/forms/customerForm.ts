import { z } from 'zod'

export const customerFormSchema = z
  .object({
    name: z.string(),
    phone: z.string(),
    email: z.string(),
    notes: z.string(),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (!v.name.trim()) add('name', 'Escribe el nombre del cliente.')
    else if (v.name.trim().length > 120) add('name', 'El nombre es demasiado largo (máximo 120 caracteres).')
    const digits = v.phone.replace(/\D/g, '')
    if (v.phone.trim() && (digits.length < 7 || digits.length > 15)) add('phone', 'Escribe un teléfono válido (de 7 a 15 dígitos).')
    if (v.email.trim() && !z.email().safeParse(v.email.trim()).success) add('email', 'Escribe un correo electrónico válido.')
    if (v.notes.length > 1000) add('notes', 'Las notas son demasiado largas (máximo 1000 caracteres).')
  })

export type CustomerFormValues = z.infer<typeof customerFormSchema>
