-- PROPOSED ONLY. Not applied. Existing club IDs remain text.
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
       -- Canonical records take precedence over old aliases.
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

-- Replace broad platform-admin entitlement writes with owner-only writes.
DROP POLICY tenant_modules_admin ON public.tenant_modules;
DROP POLICY tenant_modules_read ON public.tenant_modules;
CREATE POLICY tenant_modules_read ON public.tenant_modules FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.club_members m WHERE m.club_id = tenant_modules.club_id AND m.user_id = auth.uid()) OR public.is_system_owner());
CREATE POLICY tenant_modules_owner_insert ON public.tenant_modules FOR INSERT TO authenticated WITH CHECK (public.is_system_owner());
CREATE POLICY tenant_modules_owner_update ON public.tenant_modules FOR UPDATE TO authenticated USING (public.is_system_owner()) WITH CHECK (public.is_system_owner());
CREATE POLICY tenant_modules_owner_delete ON public.tenant_modules FOR DELETE TO authenticated USING (public.is_system_owner());
-- Restrictive check also prevents any future permissive policy widening owner writes.
CREATE POLICY tenant_modules_owner_write_insert ON public.tenant_modules AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_system_owner());
CREATE POLICY tenant_modules_owner_write_update ON public.tenant_modules AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_system_owner()) WITH CHECK (public.is_system_owner());
CREATE POLICY tenant_modules_owner_write_delete ON public.tenant_modules AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_system_owner());
DROP POLICY entitlement_events_admin_insert ON public.entitlement_events;
CREATE POLICY entitlement_events_owner_insert ON public.entitlement_events FOR INSERT TO authenticated WITH CHECK (public.is_system_owner());

-- Restrictive policies AND with existing permissions: module access never grants new role rights.
CREATE POLICY tenant_module_required ON public.expenses AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'payments'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'payments'));
CREATE POLICY tenant_module_required ON public.staff_pays AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'payments'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'payments'));
CREATE POLICY tenant_module_required ON public.base44_purchases AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'payments'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'payments'));
CREATE POLICY tenant_module_required ON public.programs AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'kanban'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'kanban'));
CREATE POLICY tenant_module_required ON public.program_templates AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'kanban'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'kanban'));
CREATE POLICY tenant_module_required ON public.program_feedbacks AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'kanban'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'kanban'));
CREATE POLICY tenant_module_required ON public.tasks AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'kanban'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'kanban'));
CREATE POLICY tenant_module_required ON public.subtasks AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'kanban'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'kanban'));
CREATE POLICY tenant_module_required ON public.time_entries AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'kanban'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'kanban'));
CREATE POLICY tenant_module_required ON public.roadmap_projects AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'kanban'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'kanban'));
CREATE POLICY tenant_module_required ON public.roadmap_tasks AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'kanban'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'kanban'));
CREATE POLICY tenant_module_required ON public.scheduled_reports AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'kanban'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'kanban'));
CREATE POLICY tenant_module_required ON public.physical_assessments AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.player_feedbacks AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.player_notes AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.skill_tests AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.skill_test_scores AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.test_benchmarks AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.test_sessions AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.training_sessions AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.training_videos AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.curriculum_documents AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'development'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'development'));
CREATE POLICY tenant_module_required ON public.facilities AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'facilities'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'facilities'));
CREATE POLICY tenant_module_required ON public.fields AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'facilities'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'facilities'));
CREATE POLICY tenant_module_required ON public.calendar_events AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.categories AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.chat_messages AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.club_invitations AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.coaches AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.documents AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.email_logs AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.email_templates AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.guardians AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.locations AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.messages AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.notes AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.notifications AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.payments AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.platform_accesses AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.player_evaluations AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.players AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.registrations AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.seasons AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.teams AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.tryout_events AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.tryout_final_registrations AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.tryout_plans AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.tryout_registrations AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.tryout_subtasks AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.tryout_tasks AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
CREATE POLICY tenant_module_required ON public.user_roleses AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.tenant_has_console_module(club_id, 'club_nexus'))
 WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));
NOTIFY pgrst, 'reload schema';
COMMIT;
