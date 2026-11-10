# Restrict module catalog reads to the system owner

The Deno suite has been added and run: assertions 1–8 are blocked before fixtures because no isolated test deployment exists; none are security passes. The existing 12 helper tests pass. No application handlers were changed to make tests pass.

## Security change

Only the system owner can read the module catalog, as requested. Preserve existing platform-admin create/update/delete access, but remove the existing ALL policy's unintended SELECT bypass. Store owner authority in a separate protected grants table, never in editable user metadata. Seed it once from the single existing account that has both the protected legacy super-admin flag and a platform-admin role. No club membership confers catalog access.

## Exact migration and policies for review

No SQL below has been applied. Approval authorizes this migration only, not the pending integrations UUID/Vault cutover.

```sql
BEGIN;
CREATE TABLE public.system_owner_grants (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_owner_grants TO authenticated;
GRANT ALL ON public.system_owner_grants TO service_role;
ALTER TABLE public.system_owner_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY system_owner_grants_self_read
  ON public.system_owner_grants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

INSERT INTO public.system_owner_grants(user_id)
SELECT u.id FROM core.users u
JOIN public.user_roles r ON r.user_id = u.id
WHERE u.is_super_admin IS TRUE AND r.role = 'admin';

CREATE FUNCTION public.is_system_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_owner_grants
    WHERE user_id = auth.uid()
  )
$$;
REVOKE ALL ON FUNCTION public.is_system_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_system_owner() TO authenticated, service_role;

DROP POLICY module_catalogs_read ON public.module_catalogs;
DROP POLICY module_catalogs_admin ON public.module_catalogs;
CREATE POLICY module_catalogs_owner_read
  ON public.module_catalogs FOR SELECT TO authenticated
  USING (public.is_system_owner());
CREATE POLICY module_catalogs_admin_insert
  ON public.module_catalogs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY module_catalogs_admin_update
  ON public.module_catalogs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY module_catalogs_admin_delete
  ON public.module_catalogs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
NOTIFY pgrst, 'reload schema';
COMMIT;
```

Non-owner platform admins cannot target rows for update/delete because SELECT is owner-only; this is the expected consequence of the requested read restriction. Service-role maintenance remains available.

## Verification after approval

- Verify all effective SELECT policies restrict reads to the owner, including any ALL policies.
- Add and run an isolated database regression test proving the owner can read a test catalog row while a club admin, member and non-owner platform admin cannot, and clients cannot grant themselves ownership.
- Mark the security finding fixed only after the migration and checks succeed.

## Still blocked

The eight integration assertions require an isolated Supabase deployment, the reviewed UUID/Vault schema, deployed endpoint contracts and provider workers with external networking denied plus fake adapters. No real provider will be contacted.