DO $$
DECLARE t text; p record;
  sensitive text[] := array['club_credentials','club_quick_books_connections','payment_processors'];
  skip text[] := array['club_members','club_integrations','club_integration_secrets','user_roles'];
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> ALL(skip) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF t = 'clubs' THEN
      EXECUTE $q$CREATE POLICY clubs_read ON public.clubs FOR SELECT TO authenticated USING (public.is_club_member(id) OR public.has_role(auth.uid(),'admin'))$q$;
      EXECUTE $q$CREATE POLICY clubs_update ON public.clubs FOR UPDATE TO authenticated USING (public.is_club_admin(id)) WITH CHECK (public.is_club_admin(id))$q$;
      EXECUTE $q$CREATE POLICY clubs_insert ON public.clubs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'))$q$;
      EXECUTE $q$CREATE POLICY clubs_delete ON public.clubs FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'))$q$;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='club_id') THEN
      IF t = ANY(sensitive) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_club_admin(club_id)) WITH CHECK (public.is_club_admin(club_id))', t||'_club_admin', t);
      ELSE
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_club_member(club_id) OR public.has_role(auth.uid(),''admin''))', t||'_read', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_club_member(club_id) OR public.has_role(auth.uid(),''admin''))', t||'_insert', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_club_member(club_id) OR public.has_role(auth.uid(),''admin'')) WITH CHECK (public.is_club_member(club_id) OR public.has_role(auth.uid(),''admin''))', t||'_update', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_club_admin(club_id))', t||'_delete', t);
      END IF;
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', t||'_read', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', t||'_admin_write', t);
    END IF;
  END LOOP;
END $$;

CREATE POLICY club_invitations_invitee_read ON public.club_invitations FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt()->>'email'));
CREATE POLICY guardians_self_read ON public.guardians FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);
CREATE POLICY trial_signupses_public_insert ON public.trial_signupses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY tryout_registrations_public_insert ON public.tryout_registrations FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT INSERT ON public.trial_signupses, public.tryout_registrations TO anon;