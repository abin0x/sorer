CREATE TABLE public.player_review_staff (club_id text NOT NULL, coach_email text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(club_id,coach_email));
GRANT SELECT,INSERT,DELETE ON public.player_review_staff TO authenticated;
GRANT ALL ON public.player_review_staff TO service_role;
ALTER TABLE public.player_review_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_grants ON public.player_review_staff FOR SELECT TO authenticated USING (public.is_club_manager(club_id) OR (public.is_club_member(club_id) AND lower(coach_email)=lower(auth.jwt()->>'email')));
CREATE POLICY manager_grant ON public.player_review_staff FOR INSERT TO authenticated WITH CHECK (public.is_club_manager(club_id));
CREATE POLICY manager_revoke ON public.player_review_staff FOR DELETE TO authenticated USING (public.is_club_manager(club_id));
CREATE POLICY core_required ON public.player_review_staff AS RESTRICTIVE FOR ALL TO authenticated USING (public.tenant_has_console_module(club_id,'club_nexus')) WITH CHECK (public.tenant_has_console_module(club_id,'club_nexus'));
CREATE OR REPLACE FUNCTION public.can_review_club_players(_club text) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT public.is_club_manager(_club) OR (
 EXISTS (SELECT 1 FROM public.club_members m WHERE m.club_id=_club AND m.user_id=auth.uid())
 AND EXISTS (SELECT 1 FROM public.player_review_staff s WHERE s.club_id=_club AND lower(s.coach_email)=lower(auth.jwt()->>'email')));
$$;