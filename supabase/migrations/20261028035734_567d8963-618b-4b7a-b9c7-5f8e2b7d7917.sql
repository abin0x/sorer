BEGIN;
CREATE FUNCTION public.tenant_has_console_module(_club text, _module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.system_owner_grants o WHERE o.user_id = auth.uid())
 OR (
   EXISTS (SELECT 1 FROM public.club_members m WHERE m.club_id = _club AND m.user_id = auth.uid())
   AND _module IN ('club_nexus','payments','kanban','development','facilities','tournaments','branding')
   AND EXISTS (
     SELECT 1 FROM public.tenant_modules c WHERE c.club_id = _club AND c.module_key = 'club_nexus'
       AND c.admin_enabled IS TRUE
       AND CASE c.status
         WHEN 'active' THEN true WHEN 'trialing' THEN true
         WHEN 'complimentary' THEN c.complimentary_expires_at IS NULL OR c.complimentary_expires_at > now()
         WHEN 'past_due' THEN c.grace_ends_at IS NULL OR c.grace_ends_at > now()
         WHEN 'canceling' THEN c.access_ends_at > now() ELSE false END
   )
   AND (_module = 'club_nexus' OR EXISTS (
     SELECT 1 FROM public.tenant_modules a WHERE a.club_id = _club
       AND a.module_key IN (_module, CASE _module
         WHEN 'development' THEN 'player_development' WHEN 'facilities' THEN 'facility_management'
         WHEN 'branding' THEN 'website' WHEN 'payments' THEN 'marketplace' ELSE _module END,
         CASE _module WHEN 'development' THEN 'player_dev' ELSE _module END)
       AND (a.module_key = _module OR NOT EXISTS (SELECT 1 FROM public.tenant_modules x WHERE x.club_id = _club AND x.module_key = _module))
       AND a.admin_enabled IS TRUE
       AND CASE a.status
         WHEN 'active' THEN true WHEN 'trialing' THEN true
         WHEN 'complimentary' THEN a.complimentary_expires_at IS NULL OR a.complimentary_expires_at > now()
         WHEN 'past_due' THEN a.grace_ends_at IS NULL OR a.grace_ends_at > now()
         WHEN 'canceling' THEN a.access_ends_at > now() ELSE false END
   ))
 );
$$;
REVOKE ALL ON FUNCTION public.tenant_has_console_module(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_has_console_module(text,text) TO authenticated, service_role;
DROP POLICY tenant_modules_admin ON public.tenant_modules;
DROP POLICY tenant_modules_read ON public.tenant_modules;
CREATE POLICY tenant_modules_read ON public.tenant_modules FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.club_members m WHERE m.club_id = tenant_modules.club_id AND m.user_id = auth.uid()) OR public.is_system_owner());
CREATE POLICY tenant_modules_owner_insert ON public.tenant_modules FOR INSERT TO authenticated WITH CHECK (public.is_system_owner());
CREATE POLICY tenant_modules_owner_update ON public.tenant_modules FOR UPDATE TO authenticated USING (public.is_system_owner()) WITH CHECK (public.is_system_owner());
CREATE POLICY tenant_modules_owner_delete ON public.tenant_modules FOR DELETE TO authenticated USING (public.is_system_owner());
CREATE POLICY tenant_modules_owner_write_insert ON public.tenant_modules AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_system_owner());
CREATE POLICY tenant_modules_owner_write_update ON public.tenant_modules AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_system_owner()) WITH CHECK (public.is_system_owner());
CREATE POLICY tenant_modules_owner_write_delete ON public.tenant_modules AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_system_owner());
DROP POLICY entitlement_events_admin_insert ON public.entitlement_events;
CREATE POLICY entitlement_events_owner_insert ON public.entitlement_events FOR INSERT TO authenticated WITH CHECK (public.is_system_owner());
DO $policy$
DECLARE target record;
BEGIN
  FOR target IN SELECT * FROM (VALUES
      ('expenses','payments'),('staff_pays','payments'),('base44_purchases','payments'),
      ('programs','kanban'),('program_templates','kanban'),('program_feedbacks','kanban'),('tasks','kanban'),('subtasks','kanban'),('time_entries','kanban'),('roadmap_projects','kanban'),('roadmap_tasks','kanban'),('scheduled_reports','kanban'),
      ('physical_assessments','development'),('player_feedbacks','development'),('player_notes','development'),('skill_tests','development'),('skill_test_scores','development'),('test_benchmarks','development'),('test_sessions','development'),('training_sessions','development'),('training_videos','development'),('curriculum_documents','development'),
      ('facilities','facilities'),('fields','facilities'),
      ('calendar_events','club_nexus'),('categories','club_nexus'),('chat_messages','club_nexus'),('club_invitations','club_nexus'),('coaches','club_nexus'),('documents','club_nexus'),('email_logs','club_nexus'),('email_templates','club_nexus'),('guardians','club_nexus'),('locations','club_nexus'),('messages','club_nexus'),('notes','club_nexus'),('notifications','club_nexus'),('payments','club_nexus'),('platform_accesses','club_nexus'),('player_evaluations','club_nexus'),('players','club_nexus'),('registrations','club_nexus'),('seasons','club_nexus'),('teams','club_nexus'),('tryout_events','club_nexus'),('tryout_final_registrations','club_nexus'),('tryout_plans','club_nexus'),('tryout_registrations','club_nexus'),('tryout_subtasks','club_nexus'),('tryout_tasks','club_nexus'),('user_roleses','club_nexus')
  ) AS targets(table_name, module_key)
  LOOP
    EXECUTE format(
      'CREATE POLICY tenant_module_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.tenant_has_console_module(club_id, %L)) WITH CHECK (public.tenant_has_console_module(club_id, %L))',
      target.table_name, target.module_key, target.module_key
    );
  END LOOP;
END;
$policy$;
NOTIFY pgrst, 'reload schema';
COMMIT;