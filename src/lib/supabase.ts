import { createClient } from '@supabase/supabase-js'

/**
 * Conexión con Supabase.
 * La URL y la clave "publishable" (antes "anon") son PÚBLICAS por diseño: viajan en el navegador
 * de cualquier usuario. La seguridad real la dan las reglas RLS de supabase/schema.sql.
 * NUNCA pongas aquí la clave "secret" / "service_role".
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://qzrnyjpukjktazaymywu.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_bpsMJ3jqrxgoXKkS6wwCug_egP8lU9b'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})
