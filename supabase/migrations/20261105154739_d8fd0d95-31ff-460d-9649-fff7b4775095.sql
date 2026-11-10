CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_club_admin(text) SET SCHEMA private;
ALTER FUNCTION public.is_club_member(text) SET SCHEMA private;
ALTER FUNCTION public.beacon_can_read(text, text) SET SCHEMA private;

CREATE OR REPLACE FUNCTION private.is_club_admin(_club_id text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select exists (select 1 from public.club_members where club_id = _club_id and user_id = auth.uid() and role in ('owner','admin'))
    or private.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.system_owner_grants where user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.beacon_can_read(_club text, _team text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT private.is_club_admin(_club) OR (
    private.is_club_member(_club) AND (
      _team IS NULL OR EXISTS (SELECT 1 FROM public.beacon_team_accesses a
        WHERE a.user_id = auth.uid() AND a.club_id = _club AND _team = ANY(a.team_ids))))
$$;

CREATE OR REPLACE FUNCTION public.my_clubs()
 RETURNS TABLE(club_id text, name text, role club_role)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select c.id, c.name, m.role from public.club_members m join public.clubs c on c.id = m.club_id where m.user_id = auth.uid()
  union
  select c.id, c.name, 'owner'::public.club_role from public.clubs c
  where private.has_role(auth.uid(), 'admin') and not exists (select 1 from public.club_members m where m.club_id = c.id and m.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.beacon_guard_message_update()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE is_author boolean := NEW.author_user_id IS NOT DISTINCT FROM auth.uid() AND auth.uid() IS NOT NULL;
DECLARE is_admin boolean := private.is_club_admin(OLD.club_id);
BEGIN
  IF coalesce(current_setting('request.jwt.claims', true), '') = ''
     OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') NOT IN ('authenticated','anon') THEN
    RETURN NEW;
  END IF;
  IF NEW.club_id <> OLD.club_id OR NEW.channel_id <> OLD.channel_id OR NEW.team_id IS DISTINCT FROM OLD.team_id
     OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id OR NEW.author_email IS DISTINCT FROM OLD.author_email
     OR NEW.created_date <> OLD.created_date OR NEW.report_count <> OLD.report_count
     OR NEW.escalated_at IS DISTINCT FROM OLD.escalated_at OR NEW.escalation_summary IS DISTINCT FROM OLD.escalation_summary THEN
    RAISE EXCEPTION 'This part of a message cannot be changed';
  END IF;
  IF NOT (is_author OR is_admin) AND (
     NEW.content IS DISTINCT FROM OLD.content OR NEW.urgency <> OLD.urgency OR NEW.is_priority <> OLD.is_priority
     OR NEW.ack_required <> OLD.ack_required OR NEW.soft_deleted <> OLD.soft_deleted
     OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status OR NEW.game_card IS DISTINCT FROM OLD.game_card
     OR NEW.location IS DISTINCT FROM OLD.location OR NEW.poll_options IS DISTINCT FROM OLD.poll_options
     OR NEW.attachment_uri IS DISTINCT FROM OLD.attachment_uri OR NEW.image_uri IS DISTINCT FROM OLD.image_uri
     OR NEW.action_url IS DISTINCT FROM OLD.action_url) THEN
    RAISE EXCEPTION 'Only the author or a club admin can change this message';
  END IF;
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edited_at := now();
    NEW.original_content := coalesce(OLD.original_content, OLD.content);
  END IF;
  NEW.updated_date := now();
  RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role), private.is_club_admin(text), private.is_club_member(text), private.beacon_can_read(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role), private.is_club_admin(text), private.is_club_member(text), private.beacon_can_read(text, text) TO authenticated, service_role;

-- Sample tables: platform admins only
DROP POLICY IF EXISTS monsters_read ON public.monsters;
DROP POLICY IF EXISTS spells_read ON public.spells;
DROP POLICY IF EXISTS weapons_read ON public.weapons;

-- App configuration: admins and club managers only
DROP POLICY IF EXISTS notification_matrixes_read ON public.notification_matrixes;
CREATE POLICY notification_matrixes_read ON public.notification_matrixes FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR public.is_system_owner()
         OR EXISTS (SELECT 1 FROM public.club_members m WHERE m.user_id = auth.uid() AND m.role IN ('owner','admin')));
DROP POLICY IF EXISTS rbacconfigs_read ON public.rbacconfigs;
CREATE POLICY rbacconfigs_read ON public.rbacconfigs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR public.is_system_owner()
         OR EXISTS (SELECT 1 FROM public.club_members m WHERE m.user_id = auth.uid() AND m.role IN ('owner','admin')));

-- Public signups go through checked server actions
DROP POLICY IF EXISTS tryout_registrations_public_insert ON public.tryout_registrations;
DROP POLICY IF EXISTS trial_signupses_public_insert ON public.trial_signupses;

-- Demo requests: only a fresh pending request
DROP POLICY IF EXISTS demo_access_requests_create ON public.demo_access_requests;
CREATE POLICY demo_access_requests_create ON public.demo_access_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending' AND source = 'request' AND coalesce(invite_sent, false) = false
    AND access_token IS NULL AND reviewed_by IS NULL AND trial_club_id IS NULL AND coalesce(is_sample, false) = false
    AND email ~* '^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$' AND length(email) <= 255
    AND length(coalesce(name, '')) <= 150 AND length(coalesce(club_name, '')) <= 200 AND length(coalesce(message, '')) <= 2000
  );