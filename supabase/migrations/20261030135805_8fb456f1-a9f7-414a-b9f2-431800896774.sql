REVOKE EXECUTE ON FUNCTION public.beacon_count_report() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.beacon_can_read(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.beacon_can_read(text, text) TO authenticated, service_role;