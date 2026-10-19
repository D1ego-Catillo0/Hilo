-- Hilo · esquema multi-negocio para Supabase (PostgreSQL)
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run.
-- Principio: cada fila pertenece a un negocio (business_id) y la base de datos
-- (no la app) impide ver o tocar filas de otro negocio (Row Level Security).

create extension if not exists pgcrypto;

-- ───────────── Negocios y perfiles ─────────────
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  active boolean not null default true,
  next_order_number integer not null default 1,
  accepts_public_orders boolean not null default true,
  created_at timestamptz not null default now()
);

-- Un perfil por usuario de Supabase Auth. Lo crea SOLO el administrador (Edge Function con service key).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  role text not null check (role in ('admin', 'owner')),
  email text not null,
  display_name text,
  consented_version text,          -- versión de los avisos que aceptó
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  check ((role = 'admin') or business_id is not null)
);

-- ───────────── Datos del negocio ─────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 200),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  number integer not null,
  created_date date not null default current_date,
  due_date date not null,
  channel text not null check (channel in ('whatsapp','instagram','presencial','telefono','otro','formulario')),
  status text not null default 'pendiente' check (status in ('pendiente','confirmado','en_preparacion','listo','entregado','cancelado')),
  details text not null default '' check (char_length(details) <= 4000),
  specifications text not null default '' check (char_length(specifications) <= 4000),
  changes text not null default '' check (char_length(changes) <= 4000),
  internal_notes text not null default '' check (char_length(internal_notes) <= 4000),
  is_new boolean not null default false,    -- true = llegó por formulario y aún no se revisa
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, number)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text,
  quantity numeric not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  date date not null,
  method text not null check (method in ('efectivo','transferencia','otro')),
  note text check (char_length(note) <= 500)
);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index on public.customers (business_id);
create index on public.orders (business_id, due_date);
create index on public.order_items (order_id);
create index on public.payments (order_id);
create index on public.activity (order_id);

-- ───────────── Seguridad (RLS) ─────────────
create or replace function public.my_business_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.business_id from public.profiles p
  join public.businesses b on b.id = p.business_id
  where p.id = auth.uid() and b.active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.activity enable row level security;

-- Negocios: el dueño ve el suyo; el admin ve y gestiona todos.
create policy businesses_select on public.businesses for select using (id = public.my_business_id() or public.is_admin());
create policy businesses_update_owner on public.businesses for update using (id = public.my_business_id()) with check (id = public.my_business_id());
create policy businesses_admin_all on public.businesses for all using (public.is_admin()) with check (public.is_admin());

-- Solo el administrador puede cambiar el slug (enlace público) o activar/desactivar un negocio.
create or replace function public.guard_business_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.slug is distinct from old.slug or new.active is distinct from old.active) and not public.is_admin() then
    raise exception 'solo_admin';
  end if;
  return new;
end $$;
create trigger businesses_guard before update on public.businesses for each row execute function public.guard_business_columns();

-- Perfiles: cada quien ve el suyo y puede registrar su consentimiento; el admin gestiona todos.
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy profiles_consent on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()) and business_id is not distinct from (select business_id from public.profiles where id = auth.uid()));

-- Datos del negocio: solo filas de MI negocio. El admin NO ve pedidos ni clientes de los negocios.
do $$
declare t text;
begin
  foreach t in array array['customers','orders','order_items','payments','activity'] loop
    execute format('create policy %I_tenant on public.%I for all using (business_id = public.my_business_id()) with check (business_id = public.my_business_id())', t, t);
  end loop;
end $$;

-- ───────────── Pedidos desde el formulario público ─────────────
-- La página pública NO escribe en las tablas: llama a esta función, que valida y crea cliente + pedido.
create or replace function public.submit_public_order(
  p_slug text, p_name text, p_phone text, p_email text,
  p_description text, p_due_date date, p_website text default ''   -- p_website: campo trampa anti-bots
) returns integer
language plpgsql security definer set search_path = public as $$
declare b public.businesses%rowtype; c uuid; o uuid; n integer;
begin
  if coalesce(p_website, '') <> '' then return 0; end if;                    -- bot: se ignora sin error
  if char_length(trim(coalesce(p_name,''))) not between 1 and 160 then raise exception 'nombre_invalido'; end if;
  if char_length(trim(coalesce(p_description,''))) not between 1 and 4000 then raise exception 'descripcion_invalida'; end if;
  if coalesce(trim(p_phone),'') = '' and coalesce(trim(p_email),'') = '' then raise exception 'contacto_requerido'; end if;
  if p_due_date is null or p_due_date < current_date or p_due_date > current_date + 730 then raise exception 'fecha_invalida'; end if;

  select * into b from public.businesses where slug = p_slug and active and accepts_public_orders for update;
  if not found then raise exception 'negocio_no_disponible'; end if;
  -- Freno sencillo contra abuso: máximo 30 pedidos nuevos sin revisar por negocio.
  if (select count(*) from public.orders where business_id = b.id and is_new) >= 30 then raise exception 'bandeja_llena'; end if;

  insert into public.customers (business_id, name, phone, email) values (b.id, trim(p_name), nullif(trim(p_phone),''), nullif(trim(p_email),'')) returning id into c;
  n := b.next_order_number;
  update public.businesses set next_order_number = n + 1 where id = b.id;
  insert into public.orders (business_id, customer_id, number, due_date, channel, status, details, is_new)
    values (b.id, c, n, p_due_date, 'formulario', 'pendiente', trim(p_description), true) returning id into o;
  insert into public.activity (business_id, order_id, type, message) values (b.id, o, 'pedido_creado', 'Pedido #' || n || ' recibido por el formulario público.');
  return n;
end $$;

revoke all on function public.submit_public_order from public;
grant execute on function public.submit_public_order to anon, authenticated;

-- Para que la página pública muestre el nombre del negocio (solo nombre, nada más).
create or replace function public.public_business_name(p_slug text) returns text
language sql stable security definer set search_path = public as $$
  select name from public.businesses where slug = p_slug and active and accepts_public_orders
$$;
grant execute on function public.public_business_name to anon, authenticated;

-- Los pedidos nuevos aparecen al instante en Hilo (tiempo real).
alter publication supabase_realtime add table public.orders;
