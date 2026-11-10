create or replace function public.get_me() returns jsonb language sql stable security definer set search_path = public, core as $$
  select to_jsonb(u) from core.users u where u.id = auth.uid()
$$;

create or replace function public.update_me(p jsonb) returns jsonb language plpgsql security definer set search_path = public, core as $$
declare r jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update core.users set
    full_name = coalesce(p->>'full_name', full_name),
    phone = coalesce(p->>'phone', phone),
    address = coalesce(p->>'address', address),
    bio = coalesce(p->>'bio', bio),
    title = coalesce(p->>'title', title),
    preferences = coalesce(p->'preferences', preferences),
    completed_tutorials = coalesce(p->'completed_tutorials', completed_tutorials),
    onboarding_completed = coalesce((p->>'onboarding_completed')::boolean, onboarding_completed),
    updated_date = now()
  where id = auth.uid();
  select to_jsonb(u) into r from core.users u where u.id = auth.uid();
  return r;
end $$;

create or replace function public.list_users() returns setof jsonb language sql stable security definer set search_path = public, core as $$
  select to_jsonb(u) from core.users u
  where exists (select 1 from core.users me where me.id = auth.uid()
    and (me.role = 'admin' or coalesce(me.is_super_admin,false) or me.club_id = u.club_id))
$$;

revoke all on function public.get_me(), public.update_me(jsonb), public.list_users() from public, anon;
grant execute on function public.get_me(), public.update_me(jsonb), public.list_users() to authenticated;