CREATE POLICY "No direct access; server reads only" ON public.platform_payment_settings FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
GRANT ALL ON public.platform_payment_settings TO service_role;
GRANT ALL ON public.tournaments, public.games, public.standings, public.tournament_registrations, public.referees TO service_role;