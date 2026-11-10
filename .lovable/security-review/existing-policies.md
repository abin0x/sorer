# Existing RLS policy inventory

Read-only snapshot before UUID conversion. No migrations applied. These are existing rules, not an approved secure replacement. Policy expressions, roles and commands are shown; permissiveness was not included in this export.

## core.users — users_delete
```sql
CREATE POLICY "users_delete" ON "core"."users" FOR DELETE TO "authenticated" USING (core.staticbot_is_admin());
```

## core.users — users_read
```sql
CREATE POLICY "users_read" ON "core"."users" FOR SELECT TO "authenticated" USING (((id = auth.uid()) OR core.staticbot_is_admin()));
```

## core.users — users_update
```sql
CREATE POLICY "users_update" ON "core"."users" FOR UPDATE TO "authenticated" USING (((id = auth.uid()) OR core.staticbot_is_admin())) WITH CHECK (((id = auth.uid()) OR core.staticbot_is_admin()));
```

## public.age_groups — age_groups_delete
```sql
CREATE POLICY "age_groups_delete" ON "public"."age_groups" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.age_groups — age_groups_insert
```sql
CREATE POLICY "age_groups_insert" ON "public"."age_groups" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.age_groups — age_groups_read
```sql
CREATE POLICY "age_groups_read" ON "public"."age_groups" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.age_groups — age_groups_update
```sql
CREATE POLICY "age_groups_update" ON "public"."age_groups" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.app_configs — app_configs_admin_write
```sql
CREATE POLICY "app_configs_admin_write" ON "public"."app_configs" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.app_configs — app_configs_read
```sql
CREATE POLICY "app_configs_read" ON "public"."app_configs" FOR SELECT TO "anon", "authenticated" USING (true);
```

## public.audit_logs — audit_logs_delete
```sql
CREATE POLICY "audit_logs_delete" ON "public"."audit_logs" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.audit_logs — audit_logs_insert
```sql
CREATE POLICY "audit_logs_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.audit_logs — audit_logs_read
```sql
CREATE POLICY "audit_logs_read" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.audit_logs — audit_logs_update
```sql
CREATE POLICY "audit_logs_update" ON "public"."audit_logs" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.base44_purchases — base44_purchases_delete
```sql
CREATE POLICY "base44_purchases_delete" ON "public"."base44_purchases" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.base44_purchases — base44_purchases_insert
```sql
CREATE POLICY "base44_purchases_insert" ON "public"."base44_purchases" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.base44_purchases — base44_purchases_read
```sql
CREATE POLICY "base44_purchases_read" ON "public"."base44_purchases" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.base44_purchases — base44_purchases_update
```sql
CREATE POLICY "base44_purchases_update" ON "public"."base44_purchases" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.calendar_events — calendar_events_delete
```sql
CREATE POLICY "calendar_events_delete" ON "public"."calendar_events" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.calendar_events — calendar_events_insert
```sql
CREATE POLICY "calendar_events_insert" ON "public"."calendar_events" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.calendar_events — calendar_events_read
```sql
CREATE POLICY "calendar_events_read" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.calendar_events — calendar_events_update
```sql
CREATE POLICY "calendar_events_update" ON "public"."calendar_events" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.categories — categories_delete
```sql
CREATE POLICY "categories_delete" ON "public"."categories" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.categories — categories_insert
```sql
CREATE POLICY "categories_insert" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.categories — categories_read
```sql
CREATE POLICY "categories_read" ON "public"."categories" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.categories — categories_update
```sql
CREATE POLICY "categories_update" ON "public"."categories" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.chat_messages — chat_messages_delete
```sql
CREATE POLICY "chat_messages_delete" ON "public"."chat_messages" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.chat_messages — chat_messages_insert
```sql
CREATE POLICY "chat_messages_insert" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.chat_messages — chat_messages_read
```sql
CREATE POLICY "chat_messages_read" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.chat_messages — chat_messages_update
```sql
CREATE POLICY "chat_messages_update" ON "public"."chat_messages" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.club_credentials — club_credentials_club_admin
```sql
CREATE POLICY "club_credentials_club_admin" ON "public"."club_credentials" FOR ALL TO "authenticated" USING (is_club_admin(club_id)) WITH CHECK (is_club_admin(club_id));
```

## public.club_integrations — Club admins view integrations
```sql
CREATE POLICY "Club admins view integrations" ON "public"."club_integrations" FOR SELECT TO "authenticated" USING (is_club_admin(club_id));
```

## public.club_invitations — club_invitations_delete
```sql
CREATE POLICY "club_invitations_delete" ON "public"."club_invitations" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.club_invitations — club_invitations_insert
```sql
CREATE POLICY "club_invitations_insert" ON "public"."club_invitations" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.club_invitations — club_invitations_invitee_read
```sql
CREATE POLICY "club_invitations_invitee_read" ON "public"."club_invitations" FOR SELECT TO "authenticated" USING ((lower(email) = lower((auth.jwt() ->> 'email'::text))));
```

## public.club_invitations — club_invitations_read
```sql
CREATE POLICY "club_invitations_read" ON "public"."club_invitations" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.club_invitations — club_invitations_update
```sql
CREATE POLICY "club_invitations_update" ON "public"."club_invitations" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.club_members — Members see their club roster
```sql
CREATE POLICY "Members see their club roster" ON "public"."club_members" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.club_quick_books_connections — club_quick_books_connections_club_admin
```sql
CREATE POLICY "club_quick_books_connections_club_admin" ON "public"."club_quick_books_connections" FOR ALL TO "authenticated" USING (is_club_admin(club_id)) WITH CHECK (is_club_admin(club_id));
```

## public.clubs — clubs_delete
```sql
CREATE POLICY "clubs_delete" ON "public"."clubs" FOR DELETE TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role));
```

## public.clubs — clubs_insert
```sql
CREATE POLICY "clubs_insert" ON "public"."clubs" FOR INSERT TO "authenticated" WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.clubs — clubs_read
```sql
CREATE POLICY "clubs_read" ON "public"."clubs" FOR SELECT TO "authenticated" USING ((is_club_member(id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.clubs — clubs_update
```sql
CREATE POLICY "clubs_update" ON "public"."clubs" FOR UPDATE TO "authenticated" USING (is_club_admin(id)) WITH CHECK (is_club_admin(id));
```

## public.coaches — coaches_delete
```sql
CREATE POLICY "coaches_delete" ON "public"."coaches" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.coaches — coaches_insert
```sql
CREATE POLICY "coaches_insert" ON "public"."coaches" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.coaches — coaches_read
```sql
CREATE POLICY "coaches_read" ON "public"."coaches" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.coaches — coaches_update
```sql
CREATE POLICY "coaches_update" ON "public"."coaches" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.curriculum_documents — curriculum_documents_delete
```sql
CREATE POLICY "curriculum_documents_delete" ON "public"."curriculum_documents" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.curriculum_documents — curriculum_documents_insert
```sql
CREATE POLICY "curriculum_documents_insert" ON "public"."curriculum_documents" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.curriculum_documents — curriculum_documents_read
```sql
CREATE POLICY "curriculum_documents_read" ON "public"."curriculum_documents" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.curriculum_documents — curriculum_documents_update
```sql
CREATE POLICY "curriculum_documents_update" ON "public"."curriculum_documents" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.demo_access_requests — demo_access_requests_create
```sql
CREATE POLICY "demo_access_requests_create" ON "public"."demo_access_requests" FOR INSERT TO PUBLIC WITH CHECK (true);
```

## public.demo_access_requests — demo_access_requests_delete
```sql
CREATE POLICY "demo_access_requests_delete" ON "public"."demo_access_requests" FOR DELETE TO PUBLIC USING (((EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.is_super_admin = true)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.system_role = 'system_owner'::text)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.system_role = 'system_admin'::text))))));
```

## public.demo_access_requests — demo_access_requests_read
```sql
CREATE POLICY "demo_access_requests_read" ON "public"."demo_access_requests" FOR SELECT TO PUBLIC USING (((EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.is_super_admin = true)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.system_role = 'system_owner'::text)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.system_role = 'system_admin'::text))))));
```

## public.demo_access_requests — demo_access_requests_update
```sql
CREATE POLICY "demo_access_requests_update" ON "public"."demo_access_requests" FOR UPDATE TO PUBLIC USING (((EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.is_super_admin = true)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.system_role = 'system_owner'::text)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.system_role = 'system_admin'::text)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.is_super_admin = true)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.system_role = 'system_owner'::text)))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.system_role = 'system_admin'::text))))));
```

## public.documents — documents_delete
```sql
CREATE POLICY "documents_delete" ON "public"."documents" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.documents — documents_insert
```sql
CREATE POLICY "documents_insert" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.documents — documents_read
```sql
CREATE POLICY "documents_read" ON "public"."documents" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.documents — documents_update
```sql
CREATE POLICY "documents_update" ON "public"."documents" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.email_logs — email_logs_delete
```sql
CREATE POLICY "email_logs_delete" ON "public"."email_logs" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.email_logs — email_logs_insert
```sql
CREATE POLICY "email_logs_insert" ON "public"."email_logs" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.email_logs — email_logs_read
```sql
CREATE POLICY "email_logs_read" ON "public"."email_logs" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.email_logs — email_logs_update
```sql
CREATE POLICY "email_logs_update" ON "public"."email_logs" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.email_templates — email_templates_create
```sql
CREATE POLICY "email_templates_create" ON "public"."email_templates" FOR INSERT TO PUBLIC WITH CHECK (((club_id = ( SELECT users.club_id
   FROM core.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))));
```

## public.email_templates — email_templates_delete
```sql
CREATE POLICY "email_templates_delete" ON "public"."email_templates" FOR DELETE TO PUBLIC USING (((club_id = ( SELECT users.club_id
   FROM core.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))));
```

## public.email_templates — email_templates_insert
```sql
CREATE POLICY "email_templates_insert" ON "public"."email_templates" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.email_templates — email_templates_read
```sql
CREATE POLICY "email_templates_read" ON "public"."email_templates" FOR SELECT TO PUBLIC USING (((club_id = ( SELECT users.club_id
   FROM core.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))));
```

## public.email_templates — email_templates_update
```sql
CREATE POLICY "email_templates_update" ON "public"."email_templates" FOR UPDATE TO PUBLIC USING (((club_id = ( SELECT users.club_id
   FROM core.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))))) WITH CHECK (((club_id = ( SELECT users.club_id
   FROM core.users
  WHERE (users.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM core.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))));
```

## public.entitlement_events — entitlement_events_admin_insert
```sql
CREATE POLICY "entitlement_events_admin_insert" ON "public"."entitlement_events" FOR INSERT TO "authenticated" WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.entitlement_events — entitlement_events_read
```sql
CREATE POLICY "entitlement_events_read" ON "public"."entitlement_events" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.expenses — expenses_delete
```sql
CREATE POLICY "expenses_delete" ON "public"."expenses" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.expenses — expenses_insert
```sql
CREATE POLICY "expenses_insert" ON "public"."expenses" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.expenses — expenses_read
```sql
CREATE POLICY "expenses_read" ON "public"."expenses" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.expenses — expenses_update
```sql
CREATE POLICY "expenses_update" ON "public"."expenses" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.facilities — facilities_delete
```sql
CREATE POLICY "facilities_delete" ON "public"."facilities" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.facilities — facilities_insert
```sql
CREATE POLICY "facilities_insert" ON "public"."facilities" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.facilities — facilities_read
```sql
CREATE POLICY "facilities_read" ON "public"."facilities" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.facilities — facilities_update
```sql
CREATE POLICY "facilities_update" ON "public"."facilities" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.fields — fields_delete
```sql
CREATE POLICY "fields_delete" ON "public"."fields" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.fields — fields_insert
```sql
CREATE POLICY "fields_insert" ON "public"."fields" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.fields — fields_read
```sql
CREATE POLICY "fields_read" ON "public"."fields" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.fields — fields_update
```sql
CREATE POLICY "fields_update" ON "public"."fields" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.guardians — guardians_delete
```sql
CREATE POLICY "guardians_delete" ON "public"."guardians" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.guardians — guardians_insert
```sql
CREATE POLICY "guardians_insert" ON "public"."guardians" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.guardians — guardians_read
```sql
CREATE POLICY "guardians_read" ON "public"."guardians" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.guardians — guardians_self_read
```sql
CREATE POLICY "guardians_self_read" ON "public"."guardians" FOR SELECT TO "authenticated" USING ((user_id = (auth.uid())::text));
```

## public.guardians — guardians_update
```sql
CREATE POLICY "guardians_update" ON "public"."guardians" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.leagues — leagues_admin_write
```sql
CREATE POLICY "leagues_admin_write" ON "public"."leagues" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.leagues — leagues_read
```sql
CREATE POLICY "leagues_read" ON "public"."leagues" FOR SELECT TO "anon", "authenticated" USING (true);
```

## public.locations — locations_delete
```sql
CREATE POLICY "locations_delete" ON "public"."locations" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.locations — locations_insert
```sql
CREATE POLICY "locations_insert" ON "public"."locations" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.locations — locations_read
```sql
CREATE POLICY "locations_read" ON "public"."locations" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.locations — locations_update
```sql
CREATE POLICY "locations_update" ON "public"."locations" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.messages — messages_delete
```sql
CREATE POLICY "messages_delete" ON "public"."messages" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.messages — messages_insert
```sql
CREATE POLICY "messages_insert" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.messages — messages_read
```sql
CREATE POLICY "messages_read" ON "public"."messages" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.messages — messages_update
```sql
CREATE POLICY "messages_update" ON "public"."messages" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.module_catalogs — module_catalogs_admin
```sql
CREATE POLICY "module_catalogs_admin" ON "public"."module_catalogs" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.module_catalogs — module_catalogs_read
```sql
CREATE POLICY "module_catalogs_read" ON "public"."module_catalogs" FOR SELECT TO "authenticated" USING (true);
```

## public.monsters — monsters_admin_write
```sql
CREATE POLICY "monsters_admin_write" ON "public"."monsters" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.monsters — monsters_read
```sql
CREATE POLICY "monsters_read" ON "public"."monsters" FOR SELECT TO "anon", "authenticated" USING (true);
```

## public.notes — notes_delete
```sql
CREATE POLICY "notes_delete" ON "public"."notes" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.notes — notes_insert
```sql
CREATE POLICY "notes_insert" ON "public"."notes" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.notes — notes_read
```sql
CREATE POLICY "notes_read" ON "public"."notes" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.notes — notes_update
```sql
CREATE POLICY "notes_update" ON "public"."notes" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.notification_matrixes — notification_matrixes_admin_write
```sql
CREATE POLICY "notification_matrixes_admin_write" ON "public"."notification_matrixes" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.notification_matrixes — notification_matrixes_read
```sql
CREATE POLICY "notification_matrixes_read" ON "public"."notification_matrixes" FOR SELECT TO "authenticated" USING ((auth.uid() IS NOT NULL));
```

## public.notifications — notifications_delete
```sql
CREATE POLICY "notifications_delete" ON "public"."notifications" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.notifications — notifications_insert
```sql
CREATE POLICY "notifications_insert" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.notifications — notifications_read
```sql
CREATE POLICY "notifications_read" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.notifications — notifications_update
```sql
CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.payment_processors — payment_processors_club_admin
```sql
CREATE POLICY "payment_processors_club_admin" ON "public"."payment_processors" FOR ALL TO "authenticated" USING (is_club_admin(club_id)) WITH CHECK (is_club_admin(club_id));
```

## public.payments — payments_delete
```sql
CREATE POLICY "payments_delete" ON "public"."payments" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.payments — payments_insert
```sql
CREATE POLICY "payments_insert" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.payments — payments_read
```sql
CREATE POLICY "payments_read" ON "public"."payments" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.payments — payments_update
```sql
CREATE POLICY "payments_update" ON "public"."payments" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.physical_assessments — physical_assessments_delete
```sql
CREATE POLICY "physical_assessments_delete" ON "public"."physical_assessments" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.physical_assessments — physical_assessments_insert
```sql
CREATE POLICY "physical_assessments_insert" ON "public"."physical_assessments" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.physical_assessments — physical_assessments_read
```sql
CREATE POLICY "physical_assessments_read" ON "public"."physical_assessments" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.physical_assessments — physical_assessments_update
```sql
CREATE POLICY "physical_assessments_update" ON "public"."physical_assessments" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.platform_accesses — platform_accesses_delete
```sql
CREATE POLICY "platform_accesses_delete" ON "public"."platform_accesses" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.platform_accesses — platform_accesses_insert
```sql
CREATE POLICY "platform_accesses_insert" ON "public"."platform_accesses" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.platform_accesses — platform_accesses_read
```sql
CREATE POLICY "platform_accesses_read" ON "public"."platform_accesses" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.platform_accesses — platform_accesses_update
```sql
CREATE POLICY "platform_accesses_update" ON "public"."platform_accesses" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.platforms — platforms_admin_write
```sql
CREATE POLICY "platforms_admin_write" ON "public"."platforms" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.platforms — platforms_read
```sql
CREATE POLICY "platforms_read" ON "public"."platforms" FOR SELECT TO "anon", "authenticated" USING (true);
```

## public.player_evaluations — player_evaluations_delete
```sql
CREATE POLICY "player_evaluations_delete" ON "public"."player_evaluations" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.player_evaluations — player_evaluations_insert
```sql
CREATE POLICY "player_evaluations_insert" ON "public"."player_evaluations" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.player_evaluations — player_evaluations_read
```sql
CREATE POLICY "player_evaluations_read" ON "public"."player_evaluations" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.player_evaluations — player_evaluations_update
```sql
CREATE POLICY "player_evaluations_update" ON "public"."player_evaluations" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.player_feedbacks — player_feedbacks_delete
```sql
CREATE POLICY "player_feedbacks_delete" ON "public"."player_feedbacks" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.player_feedbacks — player_feedbacks_insert
```sql
CREATE POLICY "player_feedbacks_insert" ON "public"."player_feedbacks" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.player_feedbacks — player_feedbacks_read
```sql
CREATE POLICY "player_feedbacks_read" ON "public"."player_feedbacks" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.player_feedbacks — player_feedbacks_update
```sql
CREATE POLICY "player_feedbacks_update" ON "public"."player_feedbacks" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.player_notes — player_notes_delete
```sql
CREATE POLICY "player_notes_delete" ON "public"."player_notes" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.player_notes — player_notes_insert
```sql
CREATE POLICY "player_notes_insert" ON "public"."player_notes" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.player_notes — player_notes_read
```sql
CREATE POLICY "player_notes_read" ON "public"."player_notes" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.player_notes — player_notes_update
```sql
CREATE POLICY "player_notes_update" ON "public"."player_notes" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.players — players_delete
```sql
CREATE POLICY "players_delete" ON "public"."players" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.players — players_insert
```sql
CREATE POLICY "players_insert" ON "public"."players" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.players — players_read
```sql
CREATE POLICY "players_read" ON "public"."players" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.players — players_update
```sql
CREATE POLICY "players_update" ON "public"."players" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.plugins — plugins_admin_write
```sql
CREATE POLICY "plugins_admin_write" ON "public"."plugins" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.plugins — plugins_read
```sql
CREATE POLICY "plugins_read" ON "public"."plugins" FOR SELECT TO "anon", "authenticated" USING (true);
```

## public.program_feedbacks — program_feedbacks_delete
```sql
CREATE POLICY "program_feedbacks_delete" ON "public"."program_feedbacks" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.program_feedbacks — program_feedbacks_insert
```sql
CREATE POLICY "program_feedbacks_insert" ON "public"."program_feedbacks" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.program_feedbacks — program_feedbacks_read
```sql
CREATE POLICY "program_feedbacks_read" ON "public"."program_feedbacks" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.program_feedbacks — program_feedbacks_update
```sql
CREATE POLICY "program_feedbacks_update" ON "public"."program_feedbacks" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.program_templates — program_templates_delete
```sql
CREATE POLICY "program_templates_delete" ON "public"."program_templates" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.program_templates — program_templates_insert
```sql
CREATE POLICY "program_templates_insert" ON "public"."program_templates" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.program_templates — program_templates_read
```sql
CREATE POLICY "program_templates_read" ON "public"."program_templates" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.program_templates — program_templates_update
```sql
CREATE POLICY "program_templates_update" ON "public"."program_templates" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.programs — programs_delete
```sql
CREATE POLICY "programs_delete" ON "public"."programs" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.programs — programs_insert
```sql
CREATE POLICY "programs_insert" ON "public"."programs" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.programs — programs_read
```sql
CREATE POLICY "programs_read" ON "public"."programs" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.programs — programs_update
```sql
CREATE POLICY "programs_update" ON "public"."programs" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.rbacconfigs — rbacconfigs_admin_write
```sql
CREATE POLICY "rbacconfigs_admin_write" ON "public"."rbacconfigs" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.rbacconfigs — rbacconfigs_read
```sql
CREATE POLICY "rbacconfigs_read" ON "public"."rbacconfigs" FOR SELECT TO "authenticated" USING ((auth.uid() IS NOT NULL));
```

## public.registrations — registrations_delete
```sql
CREATE POLICY "registrations_delete" ON "public"."registrations" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.registrations — registrations_insert
```sql
CREATE POLICY "registrations_insert" ON "public"."registrations" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.registrations — registrations_read
```sql
CREATE POLICY "registrations_read" ON "public"."registrations" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.registrations — registrations_update
```sql
CREATE POLICY "registrations_update" ON "public"."registrations" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.roadmap_projects — roadmap_projects_delete
```sql
CREATE POLICY "roadmap_projects_delete" ON "public"."roadmap_projects" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.roadmap_projects — roadmap_projects_insert
```sql
CREATE POLICY "roadmap_projects_insert" ON "public"."roadmap_projects" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.roadmap_projects — roadmap_projects_read
```sql
CREATE POLICY "roadmap_projects_read" ON "public"."roadmap_projects" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.roadmap_projects — roadmap_projects_update
```sql
CREATE POLICY "roadmap_projects_update" ON "public"."roadmap_projects" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.roadmap_tasks — roadmap_tasks_delete
```sql
CREATE POLICY "roadmap_tasks_delete" ON "public"."roadmap_tasks" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.roadmap_tasks — roadmap_tasks_insert
```sql
CREATE POLICY "roadmap_tasks_insert" ON "public"."roadmap_tasks" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.roadmap_tasks — roadmap_tasks_read
```sql
CREATE POLICY "roadmap_tasks_read" ON "public"."roadmap_tasks" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.roadmap_tasks — roadmap_tasks_update
```sql
CREATE POLICY "roadmap_tasks_update" ON "public"."roadmap_tasks" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.scheduled_reports — scheduled_reports_delete
```sql
CREATE POLICY "scheduled_reports_delete" ON "public"."scheduled_reports" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.scheduled_reports — scheduled_reports_insert
```sql
CREATE POLICY "scheduled_reports_insert" ON "public"."scheduled_reports" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.scheduled_reports — scheduled_reports_read
```sql
CREATE POLICY "scheduled_reports_read" ON "public"."scheduled_reports" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.scheduled_reports — scheduled_reports_update
```sql
CREATE POLICY "scheduled_reports_update" ON "public"."scheduled_reports" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.seasons — seasons_delete
```sql
CREATE POLICY "seasons_delete" ON "public"."seasons" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.seasons — seasons_insert
```sql
CREATE POLICY "seasons_insert" ON "public"."seasons" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.seasons — seasons_read
```sql
CREATE POLICY "seasons_read" ON "public"."seasons" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.seasons — seasons_update
```sql
CREATE POLICY "seasons_update" ON "public"."seasons" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.skill_test_scores — skill_test_scores_delete
```sql
CREATE POLICY "skill_test_scores_delete" ON "public"."skill_test_scores" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.skill_test_scores — skill_test_scores_insert
```sql
CREATE POLICY "skill_test_scores_insert" ON "public"."skill_test_scores" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.skill_test_scores — skill_test_scores_read
```sql
CREATE POLICY "skill_test_scores_read" ON "public"."skill_test_scores" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.skill_test_scores — skill_test_scores_update
```sql
CREATE POLICY "skill_test_scores_update" ON "public"."skill_test_scores" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.skill_tests — skill_tests_delete
```sql
CREATE POLICY "skill_tests_delete" ON "public"."skill_tests" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.skill_tests — skill_tests_insert
```sql
CREATE POLICY "skill_tests_insert" ON "public"."skill_tests" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.skill_tests — skill_tests_read
```sql
CREATE POLICY "skill_tests_read" ON "public"."skill_tests" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.skill_tests — skill_tests_update
```sql
CREATE POLICY "skill_tests_update" ON "public"."skill_tests" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.spells — spells_admin_write
```sql
CREATE POLICY "spells_admin_write" ON "public"."spells" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.spells — spells_read
```sql
CREATE POLICY "spells_read" ON "public"."spells" FOR SELECT TO "anon", "authenticated" USING (true);
```

## public.staff_pays — staff_pays_delete
```sql
CREATE POLICY "staff_pays_delete" ON "public"."staff_pays" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.staff_pays — staff_pays_insert
```sql
CREATE POLICY "staff_pays_insert" ON "public"."staff_pays" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.staff_pays — staff_pays_read
```sql
CREATE POLICY "staff_pays_read" ON "public"."staff_pays" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.staff_pays — staff_pays_update
```sql
CREATE POLICY "staff_pays_update" ON "public"."staff_pays" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.subscription_plans — subscription_plans_admin_write
```sql
CREATE POLICY "subscription_plans_admin_write" ON "public"."subscription_plans" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.subscription_plans — subscription_plans_read
```sql
CREATE POLICY "subscription_plans_read" ON "public"."subscription_plans" FOR SELECT TO "anon", "authenticated" USING (true);
```

## public.subtasks — subtasks_delete
```sql
CREATE POLICY "subtasks_delete" ON "public"."subtasks" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.subtasks — subtasks_insert
```sql
CREATE POLICY "subtasks_insert" ON "public"."subtasks" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.subtasks — subtasks_read
```sql
CREATE POLICY "subtasks_read" ON "public"."subtasks" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.subtasks — subtasks_update
```sql
CREATE POLICY "subtasks_update" ON "public"."subtasks" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.support_tickets — support_tickets_delete
```sql
CREATE POLICY "support_tickets_delete" ON "public"."support_tickets" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.support_tickets — support_tickets_insert
```sql
CREATE POLICY "support_tickets_insert" ON "public"."support_tickets" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.support_tickets — support_tickets_read
```sql
CREATE POLICY "support_tickets_read" ON "public"."support_tickets" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.support_tickets — support_tickets_update
```sql
CREATE POLICY "support_tickets_update" ON "public"."support_tickets" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tasks — tasks_delete
```sql
CREATE POLICY "tasks_delete" ON "public"."tasks" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.tasks — tasks_insert
```sql
CREATE POLICY "tasks_insert" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tasks — tasks_read
```sql
CREATE POLICY "tasks_read" ON "public"."tasks" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tasks — tasks_update
```sql
CREATE POLICY "tasks_update" ON "public"."tasks" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.teams — teams_delete
```sql
CREATE POLICY "teams_delete" ON "public"."teams" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.teams — teams_insert
```sql
CREATE POLICY "teams_insert" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.teams — teams_read
```sql
CREATE POLICY "teams_read" ON "public"."teams" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.teams — teams_update
```sql
CREATE POLICY "teams_update" ON "public"."teams" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tenant_modules — tenant_modules_admin
```sql
CREATE POLICY "tenant_modules_admin" ON "public"."tenant_modules" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.tenant_modules — tenant_modules_read
```sql
CREATE POLICY "tenant_modules_read" ON "public"."tenant_modules" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.test_benchmarks — test_benchmarks_delete
```sql
CREATE POLICY "test_benchmarks_delete" ON "public"."test_benchmarks" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.test_benchmarks — test_benchmarks_insert
```sql
CREATE POLICY "test_benchmarks_insert" ON "public"."test_benchmarks" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.test_benchmarks — test_benchmarks_read
```sql
CREATE POLICY "test_benchmarks_read" ON "public"."test_benchmarks" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.test_benchmarks — test_benchmarks_update
```sql
CREATE POLICY "test_benchmarks_update" ON "public"."test_benchmarks" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.test_sessions — test_sessions_delete
```sql
CREATE POLICY "test_sessions_delete" ON "public"."test_sessions" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.test_sessions — test_sessions_insert
```sql
CREATE POLICY "test_sessions_insert" ON "public"."test_sessions" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.test_sessions — test_sessions_read
```sql
CREATE POLICY "test_sessions_read" ON "public"."test_sessions" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.test_sessions — test_sessions_update
```sql
CREATE POLICY "test_sessions_update" ON "public"."test_sessions" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.time_entries — time_entries_delete
```sql
CREATE POLICY "time_entries_delete" ON "public"."time_entries" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.time_entries — time_entries_insert
```sql
CREATE POLICY "time_entries_insert" ON "public"."time_entries" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.time_entries — time_entries_read
```sql
CREATE POLICY "time_entries_read" ON "public"."time_entries" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.time_entries — time_entries_update
```sql
CREATE POLICY "time_entries_update" ON "public"."time_entries" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.training_sessions — training_sessions_delete
```sql
CREATE POLICY "training_sessions_delete" ON "public"."training_sessions" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.training_sessions — training_sessions_insert
```sql
CREATE POLICY "training_sessions_insert" ON "public"."training_sessions" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.training_sessions — training_sessions_read
```sql
CREATE POLICY "training_sessions_read" ON "public"."training_sessions" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.training_sessions — training_sessions_update
```sql
CREATE POLICY "training_sessions_update" ON "public"."training_sessions" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.training_videos — training_videos_delete
```sql
CREATE POLICY "training_videos_delete" ON "public"."training_videos" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.training_videos — training_videos_insert
```sql
CREATE POLICY "training_videos_insert" ON "public"."training_videos" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.training_videos — training_videos_read
```sql
CREATE POLICY "training_videos_read" ON "public"."training_videos" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.training_videos — training_videos_update
```sql
CREATE POLICY "training_videos_update" ON "public"."training_videos" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.trial_signupses — trial_signupses_delete
```sql
CREATE POLICY "trial_signupses_delete" ON "public"."trial_signupses" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.trial_signupses — trial_signupses_insert
```sql
CREATE POLICY "trial_signupses_insert" ON "public"."trial_signupses" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.trial_signupses — trial_signupses_public_insert
```sql
CREATE POLICY "trial_signupses_public_insert" ON "public"."trial_signupses" FOR INSERT TO "anon", "authenticated" WITH CHECK (true);
```

## public.trial_signupses — trial_signupses_read
```sql
CREATE POLICY "trial_signupses_read" ON "public"."trial_signupses" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.trial_signupses — trial_signupses_update
```sql
CREATE POLICY "trial_signupses_update" ON "public"."trial_signupses" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_events — tryout_events_delete
```sql
CREATE POLICY "tryout_events_delete" ON "public"."tryout_events" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.tryout_events — tryout_events_insert
```sql
CREATE POLICY "tryout_events_insert" ON "public"."tryout_events" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_events — tryout_events_read
```sql
CREATE POLICY "tryout_events_read" ON "public"."tryout_events" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_events — tryout_events_update
```sql
CREATE POLICY "tryout_events_update" ON "public"."tryout_events" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_final_registrations — tryout_final_registrations_delete
```sql
CREATE POLICY "tryout_final_registrations_delete" ON "public"."tryout_final_registrations" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.tryout_final_registrations — tryout_final_registrations_insert
```sql
CREATE POLICY "tryout_final_registrations_insert" ON "public"."tryout_final_registrations" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_final_registrations — tryout_final_registrations_read
```sql
CREATE POLICY "tryout_final_registrations_read" ON "public"."tryout_final_registrations" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_final_registrations — tryout_final_registrations_update
```sql
CREATE POLICY "tryout_final_registrations_update" ON "public"."tryout_final_registrations" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_plans — tryout_plans_delete
```sql
CREATE POLICY "tryout_plans_delete" ON "public"."tryout_plans" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.tryout_plans — tryout_plans_insert
```sql
CREATE POLICY "tryout_plans_insert" ON "public"."tryout_plans" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_plans — tryout_plans_read
```sql
CREATE POLICY "tryout_plans_read" ON "public"."tryout_plans" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_plans — tryout_plans_update
```sql
CREATE POLICY "tryout_plans_update" ON "public"."tryout_plans" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_registrations — tryout_registrations_delete
```sql
CREATE POLICY "tryout_registrations_delete" ON "public"."tryout_registrations" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.tryout_registrations — tryout_registrations_insert
```sql
CREATE POLICY "tryout_registrations_insert" ON "public"."tryout_registrations" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_registrations — tryout_registrations_public_insert
```sql
CREATE POLICY "tryout_registrations_public_insert" ON "public"."tryout_registrations" FOR INSERT TO "anon", "authenticated" WITH CHECK (true);
```

## public.tryout_registrations — tryout_registrations_read
```sql
CREATE POLICY "tryout_registrations_read" ON "public"."tryout_registrations" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_registrations — tryout_registrations_update
```sql
CREATE POLICY "tryout_registrations_update" ON "public"."tryout_registrations" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_subtasks — tryout_subtasks_delete
```sql
CREATE POLICY "tryout_subtasks_delete" ON "public"."tryout_subtasks" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.tryout_subtasks — tryout_subtasks_insert
```sql
CREATE POLICY "tryout_subtasks_insert" ON "public"."tryout_subtasks" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_subtasks — tryout_subtasks_read
```sql
CREATE POLICY "tryout_subtasks_read" ON "public"."tryout_subtasks" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_subtasks — tryout_subtasks_update
```sql
CREATE POLICY "tryout_subtasks_update" ON "public"."tryout_subtasks" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_tasks — tryout_tasks_delete
```sql
CREATE POLICY "tryout_tasks_delete" ON "public"."tryout_tasks" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.tryout_tasks — tryout_tasks_insert
```sql
CREATE POLICY "tryout_tasks_insert" ON "public"."tryout_tasks" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_tasks — tryout_tasks_read
```sql
CREATE POLICY "tryout_tasks_read" ON "public"."tryout_tasks" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.tryout_tasks — tryout_tasks_update
```sql
CREATE POLICY "tryout_tasks_update" ON "public"."tryout_tasks" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.user_roles — Users read own platform roles
```sql
CREATE POLICY "Users read own platform roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((user_id = auth.uid()));
```

## public.user_roleses — user_roleses_delete
```sql
CREATE POLICY "user_roleses_delete" ON "public"."user_roleses" FOR DELETE TO "authenticated" USING (is_club_admin(club_id));
```

## public.user_roleses — user_roleses_insert
```sql
CREATE POLICY "user_roleses_insert" ON "public"."user_roleses" FOR INSERT TO "authenticated" WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.user_roleses — user_roleses_read
```sql
CREATE POLICY "user_roleses_read" ON "public"."user_roleses" FOR SELECT TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.user_roleses — user_roleses_update
```sql
CREATE POLICY "user_roleses_update" ON "public"."user_roleses" FOR UPDATE TO "authenticated" USING ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((is_club_member(club_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

## public.weapons — weapons_admin_write
```sql
CREATE POLICY "weapons_admin_write" ON "public"."weapons" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## public.weapons — weapons_read
```sql
CREATE POLICY "weapons_read" ON "public"."weapons" FOR SELECT TO "authenticated" USING ((auth.uid() IS NOT NULL));
```
