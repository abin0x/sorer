
-- Beacon storage: channels, messages, per-person settings, priority audit, safety reports, team access.
CREATE TABLE public.beacon_team_accesses (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12),'hex'),
  user_id uuid NOT NULL UNIQUE,
  club_id text NOT NULL,
  team_ids text[] NOT NULL DEFAULT '{}',
  created_by text, created_by_id text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.beacon_team_accesses TO authenticated;
GRANT ALL ON public.beacon_team_accesses TO service_role;
ALTER TABLE public.beacon_team_accesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own Beacon team access" ON public.beacon_team_accesses FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.beacon_can_read(_club text, _team text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_club_admin(_club) OR (
    public.is_club_member(_club) AND (
      _team IS NULL OR EXISTS (SELECT 1 FROM public.beacon_team_accesses a
        WHERE a.user_id = auth.uid() AND a.club_id = _club AND _team = ANY(a.team_ids))))
$$;

CREATE TABLE public.channels (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12),'hex'),
  club_id text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  scope text NOT NULL DEFAULT 'club',
  team_id text, team_name text,
  allow_replies boolean DEFAULT true,
  moderation_mode text,
  description text,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_by text, created_by_id text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read channels you belong to" ON public.channels FOR SELECT TO authenticated
  USING (public.beacon_can_read(club_id, CASE WHEN scope = 'team' THEN coalesce(team_id, '') ELSE NULL END));
CREATE POLICY "Club admins add channels" ON public.channels FOR INSERT TO authenticated WITH CHECK (public.is_club_admin(club_id));
CREATE POLICY "Club admins edit channels" ON public.channels FOR UPDATE TO authenticated USING (public.is_club_admin(club_id)) WITH CHECK (public.is_club_admin(club_id));
CREATE POLICY "Club admins remove channels" ON public.channels FOR DELETE TO authenticated USING (public.is_club_admin(club_id));
CREATE POLICY "Core module required" ON public.channels AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_has_console_module(club_id, 'club_nexus')) WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));

CREATE TABLE public.channel_messages (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12),'hex'),
  club_id text NOT NULL,
  channel_id text NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  channel_type text, team_id text, parent_id text,
  author_email text, author_name text, author_role text,
  author_user_id uuid DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'message',
  content text,
  image_uri text, attachment_uri text, attachment_name text, attachment_kind text,
  poll_options jsonb, poll_votes jsonb DEFAULT '{}'::jsonb,
  action_label text, action_url text,
  game_card jsonb, location jsonb, rsvps jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_priority boolean NOT NULL DEFAULT false,
  urgency text NOT NULL DEFAULT 'info',
  ack_required boolean NOT NULL DEFAULT false,
  acknowledged_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
  moderation_status text DEFAULT 'approved',
  soft_deleted boolean NOT NULL DEFAULT false,
  edited_at timestamptz, original_content text,
  report_count integer NOT NULL DEFAULT 0,
  escalated_at timestamptz, escalation_summary jsonb,
  created_by text, created_by_id text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX channel_messages_channel_idx ON public.channel_messages(channel_id, created_date DESC);
GRANT SELECT, INSERT, UPDATE ON public.channel_messages TO authenticated;
GRANT ALL ON public.channel_messages TO service_role;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read messages in your channels" ON public.channel_messages FOR SELECT TO authenticated
  USING (public.beacon_can_read(club_id, team_id));
CREATE POLICY "Post as yourself in your channels" ON public.channel_messages FOR INSERT TO authenticated
  WITH CHECK (public.beacon_can_read(club_id, team_id) AND author_user_id = auth.uid()
    AND lower(author_email) = lower(auth.jwt()->>'email')
    AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.club_id = channel_messages.club_id
      AND (c.scope <> 'team' OR c.team_id IS NOT DISTINCT FROM channel_messages.team_id)));
CREATE POLICY "React, vote and acknowledge in your channels" ON public.channel_messages FOR UPDATE TO authenticated
  USING (public.beacon_can_read(club_id, team_id)) WITH CHECK (public.beacon_can_read(club_id, team_id));
CREATE POLICY "Core module required" ON public.channel_messages AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_has_console_module(club_id, 'club_nexus')) WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));

-- Safety: only the author or a club admin may change what a message says; everyone else may only
-- react, vote, RSVP, acknowledge or mark read. Edits keep the original text; deletes are soft only.
CREATE OR REPLACE FUNCTION public.beacon_guard_message_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE is_author boolean := NEW.author_user_id IS NOT DISTINCT FROM auth.uid() AND auth.uid() IS NOT NULL;
DECLARE is_admin boolean := public.is_club_admin(OLD.club_id);
BEGIN
  IF coalesce(current_setting('request.jwt.claims', true), '') = ''
     OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') NOT IN ('authenticated','anon') THEN
    RETURN NEW; -- server-side service work
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
END $$;
CREATE TRIGGER channel_messages_guard BEFORE UPDATE ON public.channel_messages FOR EACH ROW EXECUTE FUNCTION public.beacon_guard_message_update();

CREATE TABLE public.notification_preferences (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12),'hex'),
  club_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text,
  preset text DEFAULT 'balanced',
  mutes jsonb NOT NULL DEFAULT '[]'::jsonb,
  channel_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  quiet_hours jsonb,
  mention_push boolean DEFAULT true,
  sms_urgent boolean NOT NULL DEFAULT true,
  email_urgent boolean NOT NULL DEFAULT true,
  sms_phone text,
  created_by text, created_by_id text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage your own notification settings" ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.is_club_member(club_id));

CREATE TABLE public.priority_audit_logs (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12),'hex'),
  club_id text NOT NULL,
  channel_id text, channel_name text, message_id text,
  sender_email text, sender_name text, urgency text,
  audience_size integer,
  sender_user_id uuid DEFAULT auth.uid(),
  created_by text, created_by_id text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.priority_audit_logs TO authenticated;
GRANT ALL ON public.priority_audit_logs TO service_role;
ALTER TABLE public.priority_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Log your own priority posts" ON public.priority_audit_logs FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid() AND public.is_club_member(club_id));
CREATE POLICY "See your own or, for admins, the club's priority log" ON public.priority_audit_logs FOR SELECT TO authenticated
  USING (sender_user_id = auth.uid() OR public.is_club_admin(club_id));

CREATE TABLE public.beacon_reports (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12),'hex'),
  club_id text NOT NULL,
  message_id text NOT NULL,
  channel_id text,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  reporter_user_id uuid NOT NULL DEFAULT auth.uid(),
  reporter_email text,
  reviewed_by text, reviewed_at timestamptz, resolution text,
  created_by text, created_by_id text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.beacon_reports TO authenticated;
GRANT ALL ON public.beacon_reports TO service_role;
ALTER TABLE public.beacon_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report messages you can see" ON public.beacon_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.channel_messages m WHERE m.id = message_id AND m.club_id = beacon_reports.club_id
      AND public.beacon_can_read(m.club_id, m.team_id)));
CREATE POLICY "Reporters and club admins see reports" ON public.beacon_reports FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid() OR public.is_club_admin(club_id));
CREATE POLICY "Club admins review reports" ON public.beacon_reports FOR UPDATE TO authenticated
  USING (public.is_club_admin(club_id)) WITH CHECK (public.is_club_admin(club_id));

CREATE OR REPLACE FUNCTION public.beacon_count_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.channel_messages SET report_count = report_count + 1,
    moderation_status = CASE WHEN report_count + 1 >= 2 THEN 'held' ELSE moderation_status END
  WHERE id = NEW.message_id;
  RETURN NEW;
END $$;
CREATE TRIGGER beacon_reports_count AFTER INSERT ON public.beacon_reports FOR EACH ROW EXECUTE FUNCTION public.beacon_count_report();

ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
