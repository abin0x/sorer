CREATE OR REPLACE FUNCTION public.can_review_club_players(_club text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.is_club_manager(_club) OR (
 EXISTS (SELECT 1 FROM public.club_members m WHERE m.club_id=_club AND m.user_id=auth.uid())
 AND EXISTS (SELECT 1 FROM public.coaches c WHERE c.club_id=_club AND lower(c.email)=lower(auth.jwt()->>'email') AND c.status='active'));
$$;
REVOKE ALL ON FUNCTION public.can_review_club_players(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_club_players(text) TO authenticated, service_role;
CREATE TABLE public.player_season_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), club_id text NOT NULL, player_id text NOT NULL, season text NOT NULL,
 intent text NOT NULL DEFAULT 'returning', team_role text NOT NULL DEFAULT '', needs_follow_up boolean NOT NULL DEFAULT false,
 follow_up_status text NOT NULL DEFAULT 'open', follow_up_notes text NOT NULL DEFAULT '', updated_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(club_id,player_id,season)
);
GRANT SELECT,INSERT,UPDATE ON public.player_season_reviews TO authenticated;
GRANT ALL ON public.player_season_reviews TO service_role;
ALTER TABLE public.player_season_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON public.player_season_reviews FOR SELECT TO authenticated USING (public.can_review_club_players(club_id));
CREATE POLICY staff_create ON public.player_season_reviews FOR INSERT TO authenticated WITH CHECK (public.can_review_club_players(club_id));
CREATE POLICY staff_update ON public.player_season_reviews FOR UPDATE TO authenticated USING (public.can_review_club_players(club_id)) WITH CHECK (public.can_review_club_players(club_id));
CREATE POLICY core_required ON public.player_season_reviews AS RESTRICTIVE FOR ALL TO authenticated USING (public.tenant_has_console_module(club_id,'club_nexus')) WITH CHECK (public.tenant_has_console_module(club_id,'club_nexus'));
CREATE TABLE public.player_coach_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), club_id text NOT NULL, player_id text NOT NULL, season text NOT NULL,
 coach_user_id uuid NOT NULL DEFAULT auth.uid(), recommendation text NOT NULL, rationale text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(club_id,player_id,season,coach_user_id),
 FOREIGN KEY(club_id,player_id,season) REFERENCES public.player_season_reviews(club_id,player_id,season) ON DELETE CASCADE
);
GRANT SELECT,INSERT,UPDATE ON public.player_coach_reviews TO authenticated;
GRANT ALL ON public.player_coach_reviews TO service_role;
ALTER TABLE public.player_coach_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON public.player_coach_reviews FOR SELECT TO authenticated USING (public.can_review_club_players(club_id));
CREATE POLICY own_create ON public.player_coach_reviews FOR INSERT TO authenticated WITH CHECK (public.can_review_club_players(club_id) AND coach_user_id=auth.uid());
CREATE POLICY own_update ON public.player_coach_reviews FOR UPDATE TO authenticated USING (public.can_review_club_players(club_id) AND coach_user_id=auth.uid()) WITH CHECK (public.can_review_club_players(club_id) AND coach_user_id=auth.uid());
CREATE POLICY core_required ON public.player_coach_reviews AS RESTRICTIVE FOR ALL TO authenticated USING (public.tenant_has_console_module(club_id,'club_nexus')) WITH CHECK (public.tenant_has_console_module(club_id,'club_nexus'));
CREATE OR REPLACE FUNCTION public.guard_player_review() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE vocab jsonb; allowed boolean; oldrisk boolean;
BEGIN
 IF length(trim(NEW.season))=0 THEN RAISE EXCEPTION 'Choose a season'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.players p WHERE p.id=NEW.player_id AND p.club_id=NEW.club_id) THEN RAISE EXCEPTION 'Player must belong to the selected club'; END IF;
 IF TG_OP='UPDATE' AND (NEW.club_id,NEW.player_id,NEW.season) IS DISTINCT FROM (OLD.club_id,OLD.player_id,OLD.season) THEN RAISE EXCEPTION 'Review identity cannot change'; END IF;
 SELECT terminology INTO vocab FROM public.clubs WHERE id=NEW.club_id;
 IF TG_TABLE_NAME='player_season_reviews' THEN
  allowed := NEW.intent IN ('returning','at_risk','leaving') OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(vocab->'retentionStatuses','[]'::jsonb)) x WHERE x->>'key'=NEW.intent);
  IF NOT allowed THEN RAISE EXCEPTION 'Unknown return intent'; END IF;
  IF NEW.team_role<>'' AND NEW.team_role NOT IN ('indispensable','first_team_starter','first_team_squad','second_team_starter','second_team_squad','third_team_starter','third_team_squad') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(vocab->'teamRoles','[]'::jsonb)) x WHERE x->>'key'=NEW.team_role) THEN RAISE EXCEPTION 'Unknown current team role'; END IF;
  NEW.needs_follow_up := NEW.intent IN ('at_risk','leaving') OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(vocab->'retentionStatuses','[]'::jsonb)) x WHERE x->>'key'=NEW.intent AND x->>'requires_follow_up'='true');
  IF NEW.follow_up_status NOT IN ('open','contacted','resolved') THEN RAISE EXCEPTION 'Unknown follow-up status'; END IF;
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_club_manager(NEW.club_id) THEN
   IF TG_OP='INSERT' AND (NEW.follow_up_status<>'open' OR NEW.follow_up_notes<>'') THEN RAISE EXCEPTION 'Only club managers can manage follow-up'; END IF;
   IF TG_OP='UPDATE' AND (NEW.follow_up_status,NEW.follow_up_notes) IS DISTINCT FROM (OLD.follow_up_status,OLD.follow_up_notes) THEN RAISE EXCEPTION 'Only club managers can manage follow-up'; END IF;
  END IF;
  IF TG_OP='UPDATE' AND NEW.needs_follow_up AND NEW.intent IS DISTINCT FROM OLD.intent THEN NEW.follow_up_status:='open'; END IF;
  NEW.updated_by:=auth.uid();
 ELSE
  IF TG_OP='UPDATE' AND NEW.coach_user_id IS DISTINCT FROM OLD.coach_user_id THEN RAISE EXCEPTION 'Coach identity cannot change'; END IF;
  IF NEW.recommendation NOT IN ('move_up','keep','move_down','move_out') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(vocab->'placementRecommendations','[]'::jsonb)) x WHERE x->>'key'=NEW.recommendation) THEN RAISE EXCEPTION 'Unknown coach recommendation'; END IF;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_player_review() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_player_review() TO service_role;
CREATE TRIGGER guard_player_season_review BEFORE INSERT OR UPDATE ON public.player_season_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_player_review();
CREATE TRIGGER guard_player_coach_review BEFORE INSERT OR UPDATE ON public.player_coach_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_player_review();
CREATE INDEX player_review_director_queue ON public.player_season_reviews(club_id,season,needs_follow_up,follow_up_status);
CREATE INDEX player_coach_review_lookup ON public.player_coach_reviews(club_id,season,player_id);