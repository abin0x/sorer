CREATE TABLE public.pricing_configs (
  id text PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text,'-',''),1,24),
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now(),
  created_by text DEFAULT (auth.jwt() ->> 'email'),
  created_by_id text DEFAULT (auth.uid())::text,
  is_sample boolean DEFAULT false,
  tiers jsonb,
  modules jsonb,
  volume_multipliers jsonb,
  base_license_fee numeric,
  base_players_included numeric,
  setup_fee_first_branch numeric,
  setup_fee_additional_branch numeric,
  founding_club_total integer NOT NULL DEFAULT 10
);
GRANT SELECT ON public.pricing_configs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_configs TO authenticated;
GRANT ALL ON public.pricing_configs TO service_role;
ALTER TABLE public.pricing_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pricing" ON public.pricing_configs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owner inserts pricing" ON public.pricing_configs FOR INSERT TO authenticated WITH CHECK (public.is_system_owner());
CREATE POLICY "Owner updates pricing" ON public.pricing_configs FOR UPDATE TO authenticated USING (public.is_system_owner()) WITH CHECK (public.is_system_owner());
CREATE POLICY "Owner deletes pricing" ON public.pricing_configs FOR DELETE TO authenticated USING (public.is_system_owner());