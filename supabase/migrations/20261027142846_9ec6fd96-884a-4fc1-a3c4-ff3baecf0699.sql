CREATE TABLE public.tenant_modules (
 id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12),'hex'),
 club_id text NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
 module_key text NOT NULL,
 subscription_id text,
 status text NOT NULL DEFAULT 'pending_payment',
 admin_enabled boolean,
 stripe_subscription_id text, stripe_item_id text,
 current_period_start timestamptz, current_period_end timestamptz,
 grace_ends_at timestamptz, access_ends_at timestamptz,
 complimentary_expires_at timestamptz, complimentary_reason text, complimentary_granted_by text,
 last_synced_at timestamptz, drift_flagged boolean NOT NULL DEFAULT false, drift_detail text,
 created_by text, created_by_id text, is_sample boolean DEFAULT false,
 created_date timestamptz NOT NULL DEFAULT now(), updated_date timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(club_id,module_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_modules TO authenticated;
GRANT ALL ON public.tenant_modules TO service_role;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_modules_read ON public.tenant_modules FOR SELECT TO authenticated USING (public.is_club_member(club_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY tenant_modules_admin ON public.tenant_modules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.module_catalogs (
 id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12),'hex'),
 key text NOT NULL UNIQUE, name text NOT NULL, description text, icon text, category text,
 stripe_price_id text, price_monthly numeric, currency text NOT NULL DEFAULT 'USD',
 is_active boolean NOT NULL DEFAULT true, sort_order numeric NOT NULL DEFAULT 0,
 features jsonb NOT NULL DEFAULT '[]', nav_items jsonb NOT NULL DEFAULT '[]', route_paths jsonb NOT NULL DEFAULT '[]',
 created_by text, created_by_id text, is_sample boolean DEFAULT false,
 created_date timestamptz NOT NULL DEFAULT now(), updated_date timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_catalogs TO authenticated;
GRANT ALL ON public.module_catalogs TO service_role;
ALTER TABLE public.module_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY module_catalogs_read ON public.module_catalogs FOR SELECT TO authenticated USING (true);
CREATE POLICY module_catalogs_admin ON public.module_catalogs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.entitlement_events (
 id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12),'hex'),
 club_id text NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
 module_key text NOT NULL, action text NOT NULL, from_status text, to_status text, reason text, actor text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}',
 created_by text, created_by_id text, is_sample boolean DEFAULT false,
 created_date timestamptz NOT NULL DEFAULT now(), updated_date timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.entitlement_events TO authenticated;
GRANT ALL ON public.entitlement_events TO service_role;
ALTER TABLE public.entitlement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY entitlement_events_read ON public.entitlement_events FOR SELECT TO authenticated USING (public.is_club_member(club_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY entitlement_events_admin_insert ON public.entitlement_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX entitlement_events_club_date ON public.entitlement_events(club_id,created_date DESC);

CREATE FUNCTION public.touch_module_storage_timestamps() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at := now(); NEW.updated_date := now(); RETURN NEW; END $$;
CREATE TRIGGER tenant_modules_touch BEFORE UPDATE ON public.tenant_modules FOR EACH ROW EXECUTE FUNCTION public.touch_module_storage_timestamps();
CREATE TRIGGER module_catalogs_touch BEFORE UPDATE ON public.module_catalogs FOR EACH ROW EXECUTE FUNCTION public.touch_module_storage_timestamps();
CREATE TRIGGER entitlement_events_touch BEFORE UPDATE ON public.entitlement_events FOR EACH ROW EXECUTE FUNCTION public.touch_module_storage_timestamps();
NOTIFY pgrst, 'reload schema';