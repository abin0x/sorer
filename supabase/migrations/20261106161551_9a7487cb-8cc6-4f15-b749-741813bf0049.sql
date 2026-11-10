CREATE OR REPLACE FUNCTION private.development_player_staff(_club_id text, _player_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core, pg_temp
AS $$
DECLARE
  _manager_roles text[] := ARRAY['master_admin','admin','club_director','club_admin','branch_director','branch_admin','platform_director','age_group_director'];
  _is_coach boolean := false;
  _is_team_manager boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF private.is_club_admin(_club_id) THEN RETURN true; END IF;

  SELECT
    bool_or(COALESCE(custom_role, role) = 'coach'),
    bool_or(COALESCE(custom_role, role) = 'team_manager')
  INTO _is_coach, _is_team_manager
  FROM core.users
  WHERE id = auth.uid() AND club_id = _club_id;

  SELECT
    _is_coach OR bool_or(role = 'coach'),
    _is_team_manager OR bool_or(role = 'team_manager')
  INTO _is_coach, _is_team_manager
  FROM public.user_roleses
  WHERE user_id = auth.uid()::text AND club_id = _club_id
    AND (status IS NULL OR lower(status) IN ('active','accepted','joined'));

  IF EXISTS (
    SELECT 1 FROM core.users u
    WHERE u.id = auth.uid() AND u.club_id = _club_id
      AND COALESCE(u.custom_role, u.role) = ANY(_manager_roles)
  ) OR EXISTS (
    SELECT 1 FROM public.user_roleses r
    WHERE r.user_id = auth.uid()::text AND r.club_id = _club_id
      AND r.role = ANY(_manager_roles)
      AND (r.status IS NULL OR lower(r.status) IN ('active','accepted','joined'))
  ) THEN
    RETURN EXISTS (SELECT 1 FROM public.players p WHERE p.id = _player_id AND p.club_id = _club_id);
  END IF;

  IF _is_coach THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.players p
      JOIN public.teams t ON t.id = p.team_id AND t.club_id = p.club_id
      JOIN public.coaches c ON c.club_id = p.club_id
        AND lower(c.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        AND (t.coach_id = c.id OR COALESCE(t.coach_ids, '[]'::jsonb) @> jsonb_build_array(c.id))
      WHERE p.id = _player_id AND p.club_id = _club_id
    );
  END IF;

  IF _is_team_manager THEN
    RETURN EXISTS (
      SELECT 1 FROM public.players p
      JOIN public.teams t ON t.id = p.team_id AND t.club_id = p.club_id
      WHERE p.id = _player_id AND p.club_id = _club_id
        AND (t.team_manager_id = auth.uid()::text OR COALESCE(t.team_manager_ids, '[]'::jsonb) @> jsonb_build_array(auth.uid()::text))
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION private.development_family_player(_club_id text, _player_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM core.users u
      JOIN public.players p ON p.id = u.player_id AND p.club_id = u.club_id
      WHERE u.id = auth.uid() AND u.club_id = _club_id AND u.player_id = _player_id
    ) OR EXISTS (
      SELECT 1 FROM public.guardians g
      JOIN public.players p ON p.club_id = g.club_id AND (
        p.guardian_id = g.id
        OR (jsonb_typeof(p.guardian_ids) = 'array' AND p.guardian_ids @> jsonb_build_array(g.id))
        OR (jsonb_typeof(g.player_ids) = 'array' AND g.player_ids @> jsonb_build_array(p.id))
      )
      WHERE g.club_id = _club_id AND p.id = _player_id
        AND (g.user_id = auth.uid()::text OR lower(g.email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    )
  );
$$;

REVOKE ALL ON FUNCTION private.development_player_staff(text,text), private.development_family_player(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.development_player_staff(text,text), private.development_family_player(text,text) TO authenticated, service_role;

DROP POLICY IF EXISTS physical_assessments_read ON public.physical_assessments;
DROP POLICY IF EXISTS physical_assessments_insert ON public.physical_assessments;
DROP POLICY IF EXISTS physical_assessments_update ON public.physical_assessments;
CREATE POLICY physical_assessments_read ON public.physical_assessments FOR SELECT TO authenticated
USING (private.development_player_staff(club_id,player_id) OR private.development_family_player(club_id,player_id));
CREATE POLICY physical_assessments_insert ON public.physical_assessments FOR INSERT TO authenticated
WITH CHECK (private.development_player_staff(club_id,player_id));
CREATE POLICY physical_assessments_update ON public.physical_assessments FOR UPDATE TO authenticated
USING (private.development_player_staff(club_id,player_id))
WITH CHECK (private.development_player_staff(club_id,player_id));

DROP POLICY IF EXISTS skill_test_scores_read ON public.skill_test_scores;
DROP POLICY IF EXISTS skill_test_scores_insert ON public.skill_test_scores;
DROP POLICY IF EXISTS skill_test_scores_update ON public.skill_test_scores;
CREATE POLICY skill_test_scores_read ON public.skill_test_scores FOR SELECT TO authenticated
USING (private.development_player_staff(club_id,player_id) OR private.development_family_player(club_id,player_id));
CREATE POLICY skill_test_scores_insert ON public.skill_test_scores FOR INSERT TO authenticated
WITH CHECK (private.development_player_staff(club_id,player_id));
CREATE POLICY skill_test_scores_update ON public.skill_test_scores FOR UPDATE TO authenticated
USING (private.development_player_staff(club_id,player_id))
WITH CHECK (private.development_player_staff(club_id,player_id));

DROP POLICY IF EXISTS player_evaluations_read ON public.player_evaluations;
DROP POLICY IF EXISTS player_evaluations_insert ON public.player_evaluations;
DROP POLICY IF EXISTS player_evaluations_update ON public.player_evaluations;
CREATE POLICY player_evaluations_read ON public.player_evaluations FOR SELECT TO authenticated
USING (private.development_player_staff(club_id,player_id) OR (private.development_family_player(club_id,player_id) AND status <> 'draft'));
CREATE POLICY player_evaluations_insert ON public.player_evaluations FOR INSERT TO authenticated
WITH CHECK (private.development_player_staff(club_id,player_id));
CREATE POLICY player_evaluations_update ON public.player_evaluations FOR UPDATE TO authenticated
USING (private.development_player_staff(club_id,player_id))
WITH CHECK (private.development_player_staff(club_id,player_id));

DROP POLICY IF EXISTS player_notes_read ON public.player_notes;
DROP POLICY IF EXISTS player_notes_insert ON public.player_notes;
DROP POLICY IF EXISTS player_notes_update ON public.player_notes;
CREATE POLICY player_notes_read ON public.player_notes FOR SELECT TO authenticated
USING (private.development_player_staff(club_id,player_id) OR (private.development_family_player(club_id,player_id) AND visibility = 'shared'));
CREATE POLICY player_notes_insert ON public.player_notes FOR INSERT TO authenticated
WITH CHECK (private.development_player_staff(club_id,player_id));
CREATE POLICY player_notes_update ON public.player_notes FOR UPDATE TO authenticated
USING (private.development_player_staff(club_id,player_id))
WITH CHECK (private.development_player_staff(club_id,player_id));

DROP POLICY IF EXISTS player_feedbacks_read ON public.player_feedbacks;
DROP POLICY IF EXISTS player_feedbacks_insert ON public.player_feedbacks;
DROP POLICY IF EXISTS player_feedbacks_update ON public.player_feedbacks;
CREATE POLICY player_feedbacks_read ON public.player_feedbacks FOR SELECT TO authenticated
USING (private.development_player_staff(club_id,player_id) OR (private.development_family_player(club_id,player_id) AND status = 'sent'));
CREATE POLICY player_feedbacks_insert ON public.player_feedbacks FOR INSERT TO authenticated
WITH CHECK (private.development_player_staff(club_id,player_id));
CREATE POLICY player_feedbacks_update ON public.player_feedbacks FOR UPDATE TO authenticated
USING (private.development_player_staff(club_id,player_id))
WITH CHECK (private.development_player_staff(club_id,player_id));

DROP POLICY IF EXISTS skill_tests_insert ON public.skill_tests;
DROP POLICY IF EXISTS skill_tests_update ON public.skill_tests;
CREATE POLICY skill_tests_insert ON public.skill_tests FOR INSERT TO authenticated
WITH CHECK (private.is_club_admin(club_id));
CREATE POLICY skill_tests_update ON public.skill_tests FOR UPDATE TO authenticated
USING (private.is_club_admin(club_id))
WITH CHECK (private.is_club_admin(club_id));