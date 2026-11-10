DROP POLICY IF EXISTS "Anyone can read pricing" ON public.pricing_configs;
CREATE POLICY "Owner reads pricing configs" ON public.pricing_configs FOR SELECT TO authenticated USING (public.is_system_owner());

CREATE OR REPLACE FUNCTION public.get_public_pricing()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'tiers', tiers, 'modules', modules, 'volume_multipliers', volume_multipliers,
    'base_license_fee', base_license_fee, 'base_players_included', base_players_included,
    'setup_fee_first_branch', setup_fee_first_branch, 'setup_fee_additional_branch', setup_fee_additional_branch,
    'founding_club_total', founding_club_total)
  FROM public.pricing_configs ORDER BY updated_date DESC NULLS LAST LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_public_pricing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pricing() TO anon, authenticated;