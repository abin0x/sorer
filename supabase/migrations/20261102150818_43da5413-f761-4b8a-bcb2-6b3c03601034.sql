create or replace function public.is_club_manager(_club_id text)
returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.club_members where club_id = _club_id and user_id = auth.uid() and role in ('owner','admin'))
$$;