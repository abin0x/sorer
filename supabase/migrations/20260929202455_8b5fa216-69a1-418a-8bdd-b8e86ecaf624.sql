DROP POLICY IF EXISTS notification_matrixes_read ON public.notification_matrixes;
CREATE POLICY notification_matrixes_read ON public.notification_matrixes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS weapons_read ON public.weapons;
CREATE POLICY weapons_read ON public.weapons FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS rbacconfigs_read ON public.rbacconfigs;
CREATE POLICY rbacconfigs_read ON public.rbacconfigs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.notification_matrixes, public.weapons, public.rbacconfigs FROM anon;