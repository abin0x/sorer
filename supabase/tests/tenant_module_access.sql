-- Rollback-only database authorization regression; no provider calls or persistent fixtures.
BEGIN;
SELECT set_config('test.module_owner', (SELECT user_id::text FROM public.system_owner_grants LIMIT 1), true);
SELECT set_config('test.module_member', (SELECT id::text FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.system_owner_grants) ORDER BY id LIMIT 1), true);
INSERT INTO public.clubs(id,name) VALUES ('module-test-a','Module test A'),('module-test-b','Module test B');
INSERT INTO public.club_members(club_id,user_id,role) VALUES ('module-test-a',current_setting('test.module_member')::uuid,'admin');
INSERT INTO public.tenant_modules(club_id,module_key,status,admin_enabled)
VALUES ('module-test-a','club_nexus','active',true),('module-test-a','facilities','active',false),('module-test-b','club_nexus','active',true),('module-test-b','facilities','active',true);
INSERT INTO public.facilities(id,club_id,name) VALUES ('module-test-facility-a','module-test-a','Test field A'),('module-test-facility-b','module-test-b','Test field B');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('test.module_member'),'role','authenticated')::text,true);
DO $$ BEGIN
 IF public.tenant_has_console_module('module-test-a','facilities') THEN RAISE EXCEPTION 'Disabled add-on accessible'; END IF;
 IF NOT public.tenant_has_console_module('module-test-a','club_nexus') THEN RAISE EXCEPTION 'Enabled core inaccessible'; END IF;
 IF public.tenant_has_console_module('module-test-b','facilities') THEN RAISE EXCEPTION 'Cross-tenant grant accessible'; END IF;
 IF EXISTS (SELECT 1 FROM public.facilities WHERE id IN ('module-test-facility-a','module-test-facility-b')) THEN RAISE EXCEPTION 'Disabled/cross-tenant data visible'; END IF;
 IF EXISTS (SELECT 1 FROM public.tenant_modules WHERE club_id='module-test-b') THEN RAISE EXCEPTION 'Another tenant entitlements visible'; END IF;
 UPDATE public.tenant_modules SET admin_enabled=true WHERE club_id='module-test-a' AND module_key='facilities';
 IF FOUND THEN RAISE EXCEPTION 'Tenant admin can self-enable'; END IF;
 BEGIN
  INSERT INTO public.tenant_modules(club_id,module_key,status,admin_enabled) VALUES ('module-test-a','branding','active',true);
  RAISE EXCEPTION 'Tenant admin can insert grant';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('test.module_owner'),'role','authenticated')::text,true);
DO $$ BEGIN
 UPDATE public.tenant_modules SET admin_enabled=true WHERE club_id='module-test-a' AND module_key='facilities';
 IF NOT FOUND THEN RAISE EXCEPTION 'System owner cannot activate'; END IF;
 IF (SELECT count(*) FROM public.facilities WHERE id IN ('module-test-facility-a','module-test-facility-b'))<>2 THEN RAISE EXCEPTION 'Owner management data unavailable'; END IF;
END $$;
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('test.module_member'),'role','authenticated')::text,true);
DO $$ BEGIN
 IF NOT public.tenant_has_console_module('module-test-a','facilities') THEN RAISE EXCEPTION 'Approved module inaccessible'; END IF;
 IF (SELECT count(*) FROM public.facilities WHERE id='module-test-facility-a')<>1 THEN RAISE EXCEPTION 'Approved data inaccessible'; END IF;
 IF EXISTS (SELECT 1 FROM public.facilities WHERE id='module-test-facility-b') THEN RAISE EXCEPTION 'Cross-tenant data visible after activation'; END IF;
END $$;
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('test.module_owner'),'role','authenticated')::text,true);
UPDATE public.tenant_modules SET admin_enabled=false WHERE club_id='module-test-a' AND module_key='club_nexus';
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('test.module_member'),'role','authenticated')::text,true);
DO $$ BEGIN
 IF public.tenant_has_console_module('module-test-a','facilities') THEN RAISE EXCEPTION 'Core prerequisite bypassed'; END IF;
 IF EXISTS (SELECT 1 FROM public.facilities WHERE id='module-test-facility-a') THEN RAISE EXCEPTION 'Data accessible after core revocation'; END IF;
END $$;
RESET ROLE;
ROLLBACK;