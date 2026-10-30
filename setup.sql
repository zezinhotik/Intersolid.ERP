-- ════════════════════════════════════════════════════════════════
--  PORTAL INTERSOLID · configuração do banco (Supabase)
--  Cole tudo no SQL Editor do Supabase e clique em RUN.
--  ANTES, troque o e-mail na linha marcada com  <<< SEU E-MAIL
--  Pode rodar de novo sem problema (o script é repetível).
-- ════════════════════════════════════════════════════════════════

-- 1) Administradores principais (sempre têm acesso e aprovam os outros)
create table if not exists public.admin_emails (email text primary key);
alter table public.admin_emails enable row level security;
insert into public.admin_emails (email)
values (lower('SEU-EMAIL@intersolid.com.br'))            -- <<< SEU E-MAIL
on conflict do nothing;

-- 2) Cadastros
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null,
  email       text not null,
  phone       text not null default '',
  company     text not null default '',
  status      text not null default 'pending' check (status in ('pending','approved','rejected','revoked')),
  role        text not null default 'vendor'  check (role in ('vendor','admin')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  text,
  last_seen   timestamptz
);
alter table public.profiles enable row level security;

-- 3) Versões publicadas da apresentação e registro de acessos
create table if not exists public.versions (
  id          bigint generated always as identity primary key,
  path        text not null,
  size        integer,
  created_at  timestamptz not null default now(),
  created_by  text
);
alter table public.versions enable row level security;

create table if not exists public.logs (
  id       bigint generated always as identity primary key,
  user_id  uuid not null default auth.uid() references auth.users on delete cascade,
  email    text,
  name     text,
  event    text,
  ua       text,
  at       timestamptz not null default now()
);
alter table public.logs enable row level security;

-- 4) Funções de permissão (rodam no servidor, ninguém consegue burlar pelo navegador)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'approved' and role = 'admin')
      or exists (select 1 from admin_emails where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.can_view() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.touch() returns void
language sql security definer set search_path = public as $$
  update profiles set last_seen = now() where id = auth.uid();
$$;

-- 5) Cria o cadastro automaticamente quando alguém se registra
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare boss boolean := exists (select 1 from admin_emails where email = lower(new.email));
begin
  insert into profiles (id, name, email, phone, company, status, role, decided_at, decided_by)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), 80),
    lower(new.email),
    left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 30),
    left(coalesce(new.raw_user_meta_data ->> 'company', ''), 80),
    case when boss then 'approved' else 'pending' end,
    case when boss then 'admin' else 'vendor' end,
    case when boss then now() end,
    case when boss then 'administrador principal' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- quem já tinha conta antes deste script também ganha cadastro
insert into public.profiles (id, name, email, status, role)
select u.id,
       left(coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1)), 80),
       lower(u.email),
       case when a.email is not null then 'approved' else 'pending' end,
       case when a.email is not null then 'admin' else 'vendor' end
from auth.users u left join public.admin_emails a on a.email = lower(u.email)
on conflict (id) do nothing;
update public.profiles p set status = 'approved', role = 'admin'
from public.admin_emails a where a.email = p.email;

-- 6) Regras de acesso (Row Level Security)
drop policy if exists "ver cadastro"      on public.profiles;
drop policy if exists "decidir cadastro"  on public.profiles;
create policy "ver cadastro" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "decidir cadastro" on public.profiles for update to authenticated
  using (public.is_admin() and not exists (select 1 from public.admin_emails a where a.email = profiles.email))
  with check (public.is_admin());

drop policy if exists "ver versoes"       on public.versions;
drop policy if exists "publicar versao"   on public.versions;
create policy "ver versoes" on public.versions for select to authenticated using (public.can_view());
create policy "publicar versao" on public.versions for insert to authenticated with check (public.is_admin());

drop policy if exists "registrar acesso"  on public.logs;
drop policy if exists "ver acessos"       on public.logs;
create policy "registrar acesso" on public.logs for insert to authenticated with check (user_id = auth.uid());
create policy "ver acessos" on public.logs for select to authenticated using (public.is_admin());

-- 7) Pasta privada onde fica a apresentação
insert into storage.buckets (id, name, public) values ('apresentacao', 'apresentacao', false)
on conflict (id) do update set public = false;

drop policy if exists "baixar apresentacao"   on storage.objects;
drop policy if exists "enviar apresentacao"   on storage.objects;
create policy "baixar apresentacao" on storage.objects for select to authenticated
  using (bucket_id = 'apresentacao' and public.can_view());
create policy "enviar apresentacao" on storage.objects for insert to authenticated
  with check (bucket_id = 'apresentacao' and public.is_admin());

-- Pronto. Confira em Table Editor: devem existir profiles, versions, logs e admin_emails.
