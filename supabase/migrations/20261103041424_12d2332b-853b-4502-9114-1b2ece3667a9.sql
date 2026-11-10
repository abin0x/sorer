CREATE TABLE public.offers (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, club_id text NOT NULL REFERENCES public.clubs(id), name text NOT NULL, description text DEFAULT '', type text NOT NULL DEFAULT 'dues', access text DEFAULT 'members_only', status text NOT NULL DEFAULT 'active', sort_order numeric DEFAULT 0, config jsonb NOT NULL DEFAULT '{}'::jsonb, created_date timestamptz NOT NULL DEFAULT now(), updated_date timestamptz NOT NULL DEFAULT now(), created_by text, created_by_id text, is_sample boolean DEFAULT false
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY offers_read ON public.offers FOR SELECT TO authenticated USING (public.is_club_member(club_id));
CREATE POLICY offers_create ON public.offers FOR INSERT TO authenticated WITH CHECK(public.is_club_manager(club_id));
CREATE POLICY offers_edit ON public.offers FOR UPDATE TO authenticated USING(public.is_club_manager(club_id)) WITH CHECK(public.is_club_manager(club_id));
CREATE POLICY offers_delete ON public.offers FOR DELETE TO authenticated USING(public.is_club_manager(club_id));
CREATE POLICY offers_core ON public.offers AS RESTRICTIVE FOR ALL TO authenticated USING(public.tenant_has_console_module(club_id,'club_nexus')) WITH CHECK(public.tenant_has_console_module(club_id,'club_nexus'));
CREATE TABLE public.team_plans (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, club_id text NOT NULL REFERENCES public.clubs(id), team_id text REFERENCES public.teams(id), offer_id text REFERENCES public.offers(id) ON DELETE SET NULL, team_name text NOT NULL, age_group text DEFAULT '', gender text DEFAULT '', playing_format text DEFAULT '', branch_id text, branch_name text DEFAULT '', platform_id text, platform_name text DEFAULT '', season text DEFAULT '', coach_id text, coach_name text DEFAULT '', fall_training text DEFAULT '', winter_training text DEFAULT '', spring_training text DEFAULT '', league_games text DEFAULT '', tournament_count numeric DEFAULT 0, tournament_names jsonb NOT NULL DEFAULT '[]'::jsonb, included_programs jsonb NOT NULL DEFAULT '[]'::jsonb, club_dues numeric NOT NULL DEFAULT 0, included_services jsonb NOT NULL DEFAULT '[]'::jsonb, team_fees jsonb NOT NULL DEFAULT '[]'::jsonb, payment_plans jsonb NOT NULL DEFAULT '["full"]'::jsonb, installment_count integer DEFAULT 10, is_template boolean NOT NULL DEFAULT false, template_name text DEFAULT '', status text NOT NULL DEFAULT 'active', notes text DEFAULT '', created_date timestamptz NOT NULL DEFAULT now(), updated_date timestamptz NOT NULL DEFAULT now(), created_by text, created_by_id text, is_sample boolean DEFAULT false
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.team_plans TO authenticated;
GRANT ALL ON public.team_plans TO service_role;
ALTER TABLE public.team_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_plans_read ON public.team_plans FOR SELECT TO authenticated USING(public.is_club_member(club_id));
CREATE POLICY team_plans_create ON public.team_plans FOR INSERT TO authenticated WITH CHECK(public.is_club_manager(club_id));
CREATE POLICY team_plans_edit ON public.team_plans FOR UPDATE TO authenticated USING(public.is_club_manager(club_id)) WITH CHECK(public.is_club_manager(club_id));
CREATE POLICY team_plans_delete ON public.team_plans FOR DELETE TO authenticated USING(public.is_club_manager(club_id));
CREATE POLICY team_plans_core ON public.team_plans AS RESTRICTIVE FOR ALL TO authenticated USING(public.tenant_has_console_module(club_id,'club_nexus')) WITH CHECK(public.tenant_has_console_module(club_id,'club_nexus'));
CREATE TABLE public.marketplace_orders (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, club_id text NOT NULL REFERENCES public.clubs(id), order_number text, customer_name text, customer_email text, customer_phone text, user_id text, items jsonb NOT NULL DEFAULT '[]'::jsonb, subtotal numeric NOT NULL, fee_coverage numeric NOT NULL DEFAULT 0, total numeric NOT NULL, currency text NOT NULL DEFAULT 'USD', status text NOT NULL DEFAULT 'pending', checkout_mode text, stripe_checkout_session_id text, created_date timestamptz NOT NULL DEFAULT now(), updated_date timestamptz NOT NULL DEFAULT now(), created_by text, created_by_id text, is_sample boolean DEFAULT false
);
GRANT SELECT ON public.marketplace_orders TO authenticated;
GRANT ALL ON public.marketplace_orders TO service_role;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY marketplace_orders_manager_read ON public.marketplace_orders FOR SELECT TO authenticated USING(public.is_club_manager(club_id));
CREATE POLICY marketplace_orders_core ON public.marketplace_orders AS RESTRICTIVE FOR ALL TO authenticated USING(public.tenant_has_console_module(club_id,'club_nexus'));
CREATE OR REPLACE FUNCTION public.guard_team_dues_tenant() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE ref_club text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.club_id IS DISTINCT FROM OLD.club_id THEN RAISE EXCEPTION 'Moving records between clubs is forbidden'; END IF;
 NEW.updated_date := now();
 IF TG_TABLE_NAME='team_plans' THEN
   IF NEW.club_dues < 0 OR NEW.club_dues > 1000000 THEN RAISE EXCEPTION 'Invalid base dues'; END IF;
   IF NEW.team_id IS NOT NULL THEN SELECT club_id INTO ref_club FROM public.teams WHERE id=NEW.team_id; IF ref_club IS DISTINCT FROM NEW.club_id THEN RAISE EXCEPTION 'Team belongs to another club'; END IF; END IF;
   IF NEW.offer_id IS NOT NULL THEN SELECT club_id INTO ref_club FROM public.offers WHERE id=NEW.offer_id; IF ref_club IS DISTINCT FROM NEW.club_id THEN RAISE EXCEPTION 'Offer belongs to another club'; END IF; END IF;
   IF jsonb_typeof(NEW.included_services) <> 'array' OR jsonb_typeof(NEW.team_fees) <> 'array' THEN RAISE EXCEPTION 'Services and team fees must be lists'; END IF;
 ELSIF TG_TABLE_NAME='offers' AND COALESCE(NEW.config->>'team_id','') <> '' THEN
   SELECT club_id INTO ref_club FROM public.teams WHERE id=NEW.config->>'team_id'; IF ref_club IS DISTINCT FROM NEW.club_id THEN RAISE EXCEPTION 'Team belongs to another club'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_team_dues_tenant() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER team_plans_guard BEFORE INSERT OR UPDATE ON public.team_plans FOR EACH ROW EXECUTE FUNCTION public.guard_team_dues_tenant();
CREATE TRIGGER offers_guard BEFORE INSERT OR UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.guard_team_dues_tenant();
CREATE TRIGGER marketplace_orders_guard BEFORE INSERT OR UPDATE ON public.marketplace_orders FOR EACH ROW EXECUTE FUNCTION public.guard_team_dues_tenant();
NOTIFY pgrst, 'reload schema';