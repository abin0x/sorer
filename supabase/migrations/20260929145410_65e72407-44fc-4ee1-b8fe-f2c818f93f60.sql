-- Roles
do $$ begin create type public.club_role as enum ('owner','admin','member'); exception when duplicate_object then null; end $$;
do $$ begin create type public.app_role as enum ('admin','moderator','user'); exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own platform roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Club membership (a person can belong to several clubs)
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id text not null references public.clubs(id) on delete cascade,
  user_id uuid not null,
  role public.club_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, user_id)
);
create index if not exists club_members_user_idx on public.club_members(user_id);
grant select on public.club_members to authenticated;
grant all on public.club_members to service_role;
alter table public.club_members enable row level security;

create or replace function public.is_club_member(_club_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.club_members where club_id = _club_id and user_id = auth.uid())
$$;
create or replace function public.is_club_admin(_club_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.club_members where club_id = _club_id and user_id = auth.uid() and role in ('owner','admin'))
    or public.has_role(auth.uid(), 'admin')
$$;

create policy "Members see their club roster" on public.club_members for select to authenticated
  using (public.is_club_member(club_id) or public.has_role(auth.uid(), 'admin'));

-- Integrations (status only; no secrets here)
create table if not exists public.club_integrations (
  id uuid primary key default gen_random_uuid(),
  club_id text not null references public.clubs(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  external_account_id text,
  display_name text,
  metadata jsonb not null default '{}'::jsonb,
  connected_by uuid,
  connected_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, provider)
);
grant select on public.club_integrations to authenticated;
grant all on public.club_integrations to service_role;
alter table public.club_integrations enable row level security;
create policy "Club admins view integrations" on public.club_integrations for select to authenticated
  using (public.is_club_admin(club_id));

create or replace function public.validate_club_integration() returns trigger language plpgsql set search_path = public as $$
begin
  if new.provider not in ('stripe','quickbooks','resend') then raise exception 'invalid provider'; end if;
  if new.status not in ('connected','disconnected','pending','error') then raise exception 'invalid status'; end if;
  new.updated_at = now();
  return new;
end $$;
create trigger club_integrations_validate before insert or update on public.club_integrations
  for each row execute function public.validate_club_integration();

-- Secrets for integrations: server-only, never readable from the browser
create table if not exists public.club_integration_secrets (
  club_id text not null references public.clubs(id) on delete cascade,
  provider text not null,
  access_token text,
  refresh_token text,
  api_key text,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (club_id, provider)
);
grant all on public.club_integration_secrets to service_role;
alter table public.club_integration_secrets enable row level security;

-- Lock old credential tables away from the browser
revoke all on public.club_credentials from anon, authenticated;
revoke all on public.club_quick_books_connections from anon, authenticated;

-- My clubs helper
create or replace function public.my_clubs() returns table (club_id text, name text, role public.club_role)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, m.role from public.club_members m join public.clubs c on c.id = m.club_id where m.user_id = auth.uid()
  union
  select c.id, c.name, 'owner'::public.club_role from public.clubs c
  where public.has_role(auth.uid(), 'admin') and not exists (select 1 from public.club_members m where m.club_id = c.id and m.user_id = auth.uid())
$$;
revoke all on function public.my_clubs() from public, anon;
grant execute on function public.my_clubs() to authenticated;

-- Backfill from existing accounts
insert into public.user_roles (user_id, role)
  select id, 'admin' from core.users where role = 'admin' or system_role = 'system_owner'
  on conflict do nothing;
insert into public.club_members (club_id, user_id, role)
  select u.club_id, u.id, case when coalesce(u.is_super_admin,false) or u.role = 'admin' then 'owner'::public.club_role else 'member'::public.club_role end
  from core.users u join public.clubs c on c.id = u.club_id
  on conflict do nothing;