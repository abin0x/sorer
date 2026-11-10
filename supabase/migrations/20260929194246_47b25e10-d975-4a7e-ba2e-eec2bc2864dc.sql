CREATE OR REPLACE FUNCTION public.accept_my_invitations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; em text := lower(auth.jwt()->>'email'); r record;
BEGIN
  IF auth.uid() IS NULL OR em IS NULL THEN RETURN 0; END IF;
  FOR r IN SELECT id, club_id, role FROM public.club_invitations
           WHERE lower(email) = em AND status IN ('pending','sent') AND club_id IS NOT NULL LOOP
    INSERT INTO public.club_members(club_id, user_id, role)
    VALUES (r.club_id, auth.uid(), CASE WHEN r.role IN ('club_director','club_admin') THEN 'admin'::club_role ELSE 'member'::club_role END)
    ON CONFLICT DO NOTHING;
    UPDATE public.club_invitations SET status='accepted', accepted_by_user_id=auth.uid()::text, accepted_date=now() WHERE id=r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.accept_my_invitations() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_my_invitations() TO authenticated;