# Run module checks with the caller's permissions

The approved module policies have been applied. The security check flagged the new access helper because it runs with elevated permissions. It only needs the club memberships, owner grant and module rows already visible to the caller, so remove those elevated permissions without changing its access decisions.

## Exact follow-up migration
```sql
BEGIN;
ALTER FUNCTION public.tenant_has_console_module(text,text) SECURITY INVOKER;
NOTIFY pgrst, 'reload schema';
COMMIT;
```

No policies, club records, module grants or secrets change. Recheck the security scan and run rollback-only access tests after applying.