-- Convierte TU usuario en administrador de Hilo. Se ejecuta UNA sola vez.
-- Antes: Supabase → Authentication → Users → Add user → Create new user
--        (tu correo y una contraseña; marca "Auto Confirm User").
-- Después: cambia el correo de abajo por el tuyo y ejecuta en SQL Editor.

insert into public.profiles (id, role, email, display_name)
select id, 'admin', email, 'Administrador'
from auth.users
where email = 'TU_CORREO@ejemplo.com';   -- ← cámbialo por tu correo

-- Debe decir "INSERT 0 1". Si dice "INSERT 0 0", el correo no coincide con el del usuario creado.
