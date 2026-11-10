CREATE TABLE public.tryout_offers (
  id text PRIMARY KEY DEFAULT replace(gen_random_uuid()::text,'-',''),
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now(),
  created_by text, created_by_id text, is_sample boolean DEFAULT false,
  club_id text NOT NULL,
  tryout_plan_id text, team_id text, team_name text,
  registration_id text, player_id text, player_name text, player_photo_url text,
  player_age numeric, player_bib text, player_gender text, age_group text,
  guardian_id text, guardian_name text, guardian_email text,
  combined_score numeric DEFAULT 0, list_type text DEFAULT 'roster', rank integer,
  currency text DEFAULT 'USD', fee_amount numeric, fee_note text,
  status text NOT NULL DEFAULT 'proposed',
  proposed_by_email text, proposed_by_name text, proposed_at timestamptz,
  approved_by_email text, approved_by_name text, approved_at timestamptz,
  sent_at timestamptz, expires_at timestamptz, extended_count integer DEFAULT 0,
  responded_at timestamptz, response_channel text, response_note text,
  final_registration_id text, invite_id text,
  history jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX tryout_offers_club_plan ON public.tryout_offers(club_id, tryout_plan_id);
CREATE INDEX tryout_offers_guardian ON public.tryout_offers(club_id, lower(guardian_email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tryout_offers TO authenticated;
GRANT ALL ON public.tryout_offers TO service_role;
ALTER TABLE public.tryout_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tryout_offers_read ON public.tryout_offers FOR SELECT TO authenticated
  USING (public.can_review_club_players(club_id) OR lower(guardian_email) = lower(auth.jwt()->>'email'));
CREATE POLICY tryout_offers_insert ON public.tryout_offers FOR INSERT TO authenticated
  WITH CHECK (public.is_club_manager(club_id));
CREATE POLICY tryout_offers_update ON public.tryout_offers FOR UPDATE TO authenticated
  USING (public.is_club_manager(club_id)) WITH CHECK (public.is_club_manager(club_id));
CREATE POLICY tryout_offers_delete ON public.tryout_offers FOR DELETE TO authenticated
  USING (public.is_club_manager(club_id));
CREATE POLICY tenant_module_required ON public.tryout_offers AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_has_console_module(club_id, 'club_nexus')) WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));

CREATE TRIGGER tryout_offers_touch BEFORE UPDATE ON public.tryout_offers
  FOR EACH ROW EXECUTE FUNCTION public.staticbot_touch_updated_date();