# Secure per-club integrations and UUID conversion

## Approval boundary
No database changes have been applied. Approval of this plan authorizes preparation, not execution of database migrations. Each complete migration and every affected RLS policy will be shown for separate review before application. The SQL below is the proposed new integration storage migration; it depends on the separately reviewed UUID conversion migration.

## Confirmed findings
- All three existing clubs use non-UUID text IDs. Convert them and all references to UUIDs, as requested.
- There are 234 existing policies on tables containing club references. Type changes must preserve or deliberately replace each policy, with the full before/after inventory shown before application.
- Existing `is_club_admin(text)` allows a global administrator without club membership. The new `is_club_admin(_club uuid)` must require actual owner/admin membership.
- Existing integration credentials are stored in plaintext columns. Creating new tables alone will not fix this: provider code and existing credentials must move to Vault together.
- Vault is installed. Whether Vault is exposed through hosted Data API settings remains unverified; do not infer safety from an empty database setting.

## Implementation stages

### 1. UUID conversion migration — prepare and show before applying
- Create a service-only old-ID → UUID mapping with explicit grants, RLS and no client policies. Generate one UUID per existing club; preserve the mapping for controlled migration recovery.
- Audit all club reference columns, including `core.users.club_id` and `demo_access_requests.trial_club_id`, foreign keys, policies, views, RPCs, triggers, JSON references and stored links. Unknown/orphaned references block conversion; never discard records or silently create memberships.
- Produce the complete SQL and full policy inventory, rather than an unreviewed loop that silently regenerates access rules.
- Convert IDs and references in a transaction during a maintenance window; switch the new-club default to `gen_random_uuid()` and restore validated foreign keys and RLS. Update `my_clubs`, invitation acceptance and membership functions to UUID signatures.
- Use `club_members` as authorization truth. A club selection is only an identifier to validate; neither user metadata nor legacy profile roles prove club access.
- Replace the old text admin RPC rather than retaining ambiguous overloads. Update its callers to `_club`. Remove global-admin bypass from club-admin authority; review separate System Console permissions explicitly so platform administration does not masquerade as club ownership.
- Review signup-trigger compatibility: do not copy metadata club IDs into a UUID access field or create memberships from user-editable metadata.

### 2. New integration storage migration — proposed exact SQL
Prerequisites: club IDs and membership references are UUIDs; the reviewed conversion migration has replaced the old text helper; Vault is installed. No changes to reserved Vault tables, grants or internal functions are proposed.

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.is_club_admin(_club uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  );
$$;
REVOKE ALL ON FUNCTION public.is_club_admin(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_admin(uuid)
  TO authenticated, service_role;

CREATE TABLE public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_account_id text,
  display_name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, provider, external_account_id)
);
GRANT SELECT ON public.integration_connections TO authenticated;
GRANT ALL ON public.integration_connections TO service_role;
REVOKE ALL ON public.integration_connections FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.integration_connections FROM authenticated;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_connections_member_select
ON public.integration_connections FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.club_members m
  WHERE m.club_id = integration_connections.club_id
    AND m.user_id = auth.uid()
));

-- Enforce uniqueness for providers without an external account ID too.
CREATE UNIQUE INDEX integration_connections_null_account_unique
ON public.integration_connections (club_id, provider)
WHERE external_account_id IS NULL;

CREATE TABLE public.integration_secrets (
  connection_id uuid PRIMARY KEY
    REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  vault_secret_id uuid NOT NULL
);
GRANT ALL ON public.integration_secrets TO service_role;
REVOKE ALL ON public.integration_secrets FROM PUBLIC, anon, authenticated;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies.

CREATE TABLE public.oauth_states (
  state text PRIMARY KEY,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.oauth_states TO service_role;
REVOKE ALL ON public.oauth_states FROM PUBLIC, anon, authenticated;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies.
CREATE INDEX oauth_states_expiry ON public.oauth_states (expires_at);

CREATE FUNCTION public.validate_integration_connection()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.provider NOT IN
    ('stripe','quickbooks','facebook','instagram','linkedin','resend')
    OR NEW.status NOT IN ('active','needs_reauth','revoked') THEN
    RAISE EXCEPTION 'Invalid integration provider or status';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.club_id IS DISTINCT FROM OLD.club_id
      OR NEW.provider IS DISTINCT FROM OLD.provider THEN
      RAISE EXCEPTION 'Connection ownership is immutable';
    END IF;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_integration_connection()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER integration_connections_validate
BEFORE INSERT OR UPDATE ON public.integration_connections
FOR EACH ROW EXECUTE FUNCTION public.validate_integration_connection();

CREATE FUNCTION public.validate_oauth_state()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.provider NOT IN
    ('stripe','quickbooks','facebook','instagram','linkedin','resend')
    OR NEW.expires_at <= now()
    OR NEW.expires_at > now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'Invalid OAuth state';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = NEW.club_id AND m.user_id = NEW.user_id
      AND m.role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Club administrator membership required';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_oauth_state()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER oauth_states_validate
BEFORE INSERT OR UPDATE ON public.oauth_states
FOR EACH ROW EXECUTE FUNCTION public.validate_oauth_state();

CREATE FUNCTION public.store_connection_secret(_conn uuid, _secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
DECLARE secret_id uuid;
BEGIN
  IF _secret IS NULL OR length(_secret) = 0 THEN
    RAISE EXCEPTION 'Secret required';
  END IF;
  -- Serialize writes and prevent replacing a revoked connection's secret.
  PERFORM 1 FROM public.integration_connections
    WHERE id = _conn AND status <> 'revoked' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection unavailable';
  END IF;
  SELECT s.vault_secret_id INTO secret_id
    FROM public.integration_secrets s WHERE s.connection_id = _conn;
  IF secret_id IS NULL THEN
    SELECT vault.create_secret(_secret) INTO secret_id;
    INSERT INTO public.integration_secrets(connection_id, vault_secret_id)
      VALUES (_conn, secret_id);
  ELSE
    PERFORM vault.update_secret(secret_id, _secret);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.store_connection_secret(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_connection_secret(uuid, text)
  TO service_role;

CREATE FUNCTION public.get_connection_secret(_conn uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
DECLARE result text;
BEGIN
  SELECT v.decrypted_secret INTO result
  FROM public.integration_secrets s
  JOIN public.integration_connections c ON c.id = s.connection_id
  JOIN vault.decrypted_secrets v ON v.id = s.vault_secret_id
  WHERE s.connection_id = _conn AND c.status <> 'revoked';
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_connection_secret(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_connection_secret(uuid)
  TO service_role;

COMMIT;
```

**New RLS policy inventory:** one authenticated membership-only SELECT policy on `integration_connections`; zero policies on `integration_secrets` and `oauth_states`. No client write policies. Service role bypasses RLS and stays server-only.

### 3. Credential and provider cutover — separately reviewed migration
- Move existing credential payloads directly from old storage into Vault within the database transaction, without fetching or printing their values. Show that migration before applying; then remove plaintext credentials and stop all old writes. Inspect legacy credential storage too; do not claim the whole app is secure while a plaintext provider path remains.
- Use authenticated TanStack server functions for internal writes and verified public server routes for OAuth callbacks, rather than new Edge Functions on this app's stack.
- Validate actual owner/admin membership before loading the service-role client. Resolve a connection's owning club from stored records rather than trusting a request's club ID.
- Generate random one-time OAuth states. Atomically consume unexpired states, match the provider, and recheck the recorded user's current membership before exchanging/persisting tokens. Prevent state replay and sanitize callback errors.
- Never return decrypted secrets to the browser. The service-only Vault getter is used solely inside server code; redact provider errors before logs, saved errors and user responses.
- Confirm hosted Data API exposed schemas exclude Vault, and check anonymous/authenticated Vault access fails. Do not change reserved Vault internals.
- These changes provide secure storage for all six providers, not new Facebook/Instagram/LinkedIn publishing features or an unrelated signup redesign.

## Verification and release gate
Run rollback-only database tests with two clubs: own-club member reads succeed; other-club and anonymous reads fail; member/admin direct writes fail; secrets and states are unreadable; both secret RPCs reject anon/authenticated and work only for service role; global admin without membership fails club-admin checks. Test concrete allowed provider/status values and rejected values, UUID reference preservation, duplicate connection handling, state expiry/replay and removed membership. Never print credential values during tests.

Verify signup/invitation and each existing Stripe/QuickBooks/Resend flow after cutover. Real authenticated browser testing is currently unavailable for this external Supabase connection; distinguish database/server checks from user-session checks and do not claim unverified flows passed.

**Pending:** complete UUID conversion SQL and full affected-policy inventory; separate migration approval; hosted Vault exposure verification; provider cutover and tests. Keep the existing system unchanged until the complete dependency review and migration approvals are finished.