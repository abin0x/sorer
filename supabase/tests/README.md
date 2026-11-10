# Deno integration security contract tests

Test files only: this does not create Edge handlers or change application code.

The current app uses TanStack actions, not the requested deployed Edge contracts. The UUID/Vault tables remain unapplied. Missing prerequisites explicitly fail all eight assertions; they never count as security passes.

## Run safely

Use only a disposable localhost Supabase stack with the reviewed UUID/Vault schema and four deployed contracts: `connect-resend`, `disconnect-integration`, `oauth-start`, `oauth-callback` (with OPTIONS support). No production targets are allowed. Configure actual worker/container egress denial except local Supabase and local fake provider adapters. Deno permissions alone cannot block a worker's outbound networking. No real provider credentials may be loaded. The isolation variable is an operator acknowledgement, not a firewall.

Fake adapters must accept `re_fake_…` keys and `fake-success-code` for QuickBooks, returning fake account/token data. Do not replace authorization handlers with mocks. Assertion 6 requires a successful fake exchange so state consumption and query-tenant isolation are verified, not merely a generic rejection.

Inject these variables securely (never commit values):
- `SUPABASE_URL`: localhost test API
- `SUPABASE_ANON_KEY`: test public key
- `SUPABASE_SERVICE_ROLE_KEY`: test service role
- `INTEGRATION_TEST_FUNCTIONS_URL`: localhost URL ending `/functions/v1`
- `INTEGRATION_TEST_DATABASE_URL`: local disposable Postgres for Vault-entry teardown
- `INTEGRATION_TEST_PROVIDER_ISOLATION=network-denied`: acknowledge enforced worker isolation

```sh
deno test --node-modules-dir=auto --allow-env --allow-net supabase/tests/integrations_test.ts
```

Setup creates A/B clubs and adminA/memberA/adminB/memberB via service role, signs each in through real password auth, and stores fake sentinels through the Vault RPC. Teardown removes only test-owned connections, states, Vault entries, memberships, clubs and auth users, including callback-created connections. A teardown failure fails the run. No migrations, policies or provider endpoints are modified. Assertion 8 covers exercised responses, not every possible response/input.

## Latest execution

All eight steps failed at the safety prerequisite: no disposable localhost test stack was configured. Zero security assertions passed; none ran against real JWT fixtures. The connected database also lacks `integration_connections`, `integration_secrets` and `oauth_states`, and the requested Edge endpoints are not present in the project. No users, tenants, Vault entries or provider calls were created by this execution.