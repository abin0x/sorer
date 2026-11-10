create or replace function public.validate_club_integration()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.provider not in ('stripe','echelon','quickbooks','resend','square','paypal','custom_gateway','google_calendar','google_maps','facebook','instagram','x','youtube','linkedin') then raise exception 'invalid provider'; end if;
  if new.status not in ('connected','disconnected','pending','error') then raise exception 'invalid status'; end if;
  new.updated_at = now();
  return new;
end $$;

alter table public.clubs add column if not exists preferred_payment_provider text
  check (preferred_payment_provider in ('stripe','echelon'));

create table public.platform_payment_settings (
  id boolean primary key default true check (id),
  preferred_provider text not null default 'stripe' check (preferred_provider in ('stripe','echelon')),
  updated_at timestamptz not null default now()
);
grant select on public.platform_payment_settings to authenticated;
grant all on public.platform_payment_settings to service_role;
alter table public.platform_payment_settings enable row level security;
create policy "Signed-in users read platform payment default" on public.platform_payment_settings for select to authenticated using (true);
insert into public.platform_payment_settings (id) values (true) on conflict do nothing;