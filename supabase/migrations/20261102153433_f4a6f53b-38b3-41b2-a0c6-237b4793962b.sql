create or replace function public.is_club_member(_club_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.club_members where club_id = _club_id and user_id = auth.uid())
      or exists (select 1 from public.system_owner_grants where user_id = auth.uid())
$$;
create or replace function public.is_club_admin(_club_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.club_members where club_id = _club_id and user_id = auth.uid() and role in ('owner','admin'))
    or public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.system_owner_grants where user_id = auth.uid())
$$;
create or replace function public.is_club_manager(_club_id text)
returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.club_members where club_id = _club_id and user_id = auth.uid() and role in ('owner','admin'))
      or public.is_system_owner()
$$;