BEGIN;
CREATE TABLE public.system_owner_grants (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_owner_grants TO authenticated;
GRANT ALL ON public.system_owner_grants TO service_role;
ALTER TABLE public.system_owner_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY system_owner_grants_self_read ON public.system_owner_grants FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.system_owner_grants(user_id)
SELECT u.id FROM core.users u JOIN public.user_roles r ON r.user_id = u.id WHERE u.is_super_admin IS TRUE AND r.role = 'admin';
CREATE FUNCTION public.is_system_owner() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$ SELECT EXISTS (SELECT 1 FROM public.system_owner_grants WHERE user_id = auth.uid()) $$;
REVOKE ALL ON FUNCTION public.is_system_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_system_owner() TO authenticated, service_role;
DROP POLICY module_catalogs_read ON public.module_catalogs;
DROP POLICY module_catalogs_admin ON public.module_catalogs;
CREATE POLICY module_catalogs_owner_read ON public.module_catalogs FOR SELECT TO authenticated USING (public.is_system_owner());
CREATE POLICY module_catalogs_admin_insert ON public.module_catalogs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY module_catalogs_admin_update ON public.module_catalogs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY module_catalogs_admin_delete ON public.module_catalogs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
NOTIFY pgrst, 'reload schema';
COMMIT;