-- Membership-only club admin check (platform roles are not tenant authority)
create or replace function public.is_club_manager(_club_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.club_members where club_id = _club_id and user_id = auth.uid() and role in ('owner','admin'))
$$;
revoke all on function public.is_club_manager(text) from public, anon;
grant execute on function public.is_club_manager(text) to authenticated, service_role;

-- Members of the owning club can read safe connection fields; no client writes
drop policy if exists "Club admins view integrations" on public.club_integrations;
create policy "Club members view integrations" on public.club_integrations for select to authenticated using (public.is_club_member(club_id));
revoke insert, update, delete on public.club_integrations from anon, authenticated;
revoke all on public.club_integrations from anon;

-- Allowed providers
create or replace function public.validate_club_integration()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.provider not in ('stripe','quickbooks','resend','square','paypal','custom_gateway','google_calendar','google_maps','facebook','instagram','x','youtube','linkedin') then raise exception 'invalid provider'; end if;
  if new.status not in ('connected','disconnected','pending','error') then raise exception 'invalid status'; end if;
  new.updated_at = now();
  return new;
end $$;

-- Vault references (no plaintext)
create table public.club_integration_vault_refs (
  club_id text not null,
  provider text not null,
  vault_secret_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (club_id, provider)
);
grant all on public.club_integration_vault_refs to service_role;
revoke all on public.club_integration_vault_refs from anon, authenticated;
alter table public.club_integration_vault_refs enable row level security;

-- Single-use OAuth states bound server-side
create table public.club_oauth_states (
  state text primary key,
  club_id text not null,
  user_id uuid not null,
  provider text not null,
  origin text not null,
  code_verifier text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.club_oauth_states to service_role;
revoke all on public.club_oauth_states from anon, authenticated;
alter table public.club_oauth_states enable row level security;

create or replace function public.integration_secret_put(_club text, _provider text, _secret text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare _id uuid;
begin
  select vault_secret_id into _id from public.club_integration_vault_refs where club_id=_club and provider=_provider;
  if _id is null then
    _id := vault.create_secret(_secret, 'club_int_'||_club||'_'||_provider||'_'||gen_random_uuid());
    insert into public.club_integration_vault_refs(club_id, provider, vault_secret_id) values (_club,_provider,_id);
  else
    perform vault.update_secret(_id, _secret);
    update public.club_integration_vault_refs set updated_at=now() where club_id=_club and provider=_provider;
  end if;
end $$;

create or replace function public.integration_secret_get(_club text, _provider text)
returns text language sql stable security definer set search_path = public, vault as $$
  select d.decrypted_secret from public.club_integration_vault_refs r join vault.decrypted_secrets d on d.id=r.vault_secret_id
  where r.club_id=_club and r.provider=_provider
$$;

create or replace function public.integration_secret_delete(_club text, _provider text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare _id uuid;
begin
  delete from public.club_integration_vault_refs where club_id=_club and provider=_provider returning vault_secret_id into _id;
  if _id is not null then delete from vault.secrets where id=_id; end if;
end $$;

revoke all on function public.integration_secret_put(text,text,text) from public, anon, authenticated;
revoke all on function public.integration_secret_get(text,text) from public, anon, authenticated;
revoke all on function public.integration_secret_delete(text,text) from public, anon, authenticated;
grant execute on function public.integration_secret_put(text,text,text) to service_role;
grant execute on function public.integration_secret_get(text,text) to service_role;
grant execute on function public.integration_secret_delete(text,text) to service_role;

-- Retire the plaintext secrets table (it holds no rows)
drop table if exists public.club_integration_secrets;