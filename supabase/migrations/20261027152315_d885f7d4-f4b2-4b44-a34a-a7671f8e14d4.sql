BEGIN;
SELECT set_config('test.catalog_owner', (SELECT user_id::text FROM public.system_owner_grants LIMIT 1), true);
INSERT INTO public.module_catalogs(id, key, name) VALUES ('security-test-catalog-owner-only', 'security-test-catalog-owner-only', 'Security regression fixture');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.catalog_owner'), 'role', 'authenticated')::text, true);
DO $$ BEGIN
 IF NOT public.is_system_owner() THEN RAISE EXCEPTION 'Owner check failed'; END IF;
 IF (SELECT count(*) FROM public.module_catalogs WHERE id='security-test-catalog-owner-only') <> 1 THEN RAISE EXCEPTION 'System owner cannot read catalog'; END IF;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$ BEGIN
 IF public.is_system_owner() THEN RAISE EXCEPTION 'Non-owner accepted'; END IF;
 IF (SELECT count(*) FROM public.module_catalogs WHERE id='security-test-catalog-owner-only') <> 0 THEN RAISE EXCEPTION 'Non-owner can read catalog'; END IF;
 BEGIN
 INSERT INTO public.system_owner_grants(user_id) VALUES (auth.uid());
 RAISE EXCEPTION 'Client can self-grant ownership';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.module_catalogs'::regclass AND polcmd='*') THEN RAISE EXCEPTION 'ALL policy bypasses owner-only reads'; END IF;
 IF (SELECT count(*) FROM pg_policy WHERE polrelid='public.module_catalogs'::regclass AND polcmd='r') <> 1 THEN RAISE EXCEPTION 'Unexpected additional read policy'; END IF;
END $$;
ROLLBACK;