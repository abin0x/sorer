BEGIN;
ALTER FUNCTION public.tenant_has_console_module(text,text) SECURITY INVOKER;
NOTIFY pgrst, 'reload schema';
COMMIT;