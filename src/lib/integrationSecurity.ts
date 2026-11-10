export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export class IntegrationAccessError extends Error {
  readonly status = 403;
  constructor() {
    super('Only tenant owners and administrators can manage integrations.');
    this.name = 'IntegrationAccessError';
  }
}

export interface TenantAuthorizationClient {
  rpc(name: string, args: Record<string, string>): PromiseLike<{
    data: unknown;
    error: unknown;
  }>;
}

/** The supplied client must belong to the verified caller, never service_role. */
export async function requireTenantAdmin(
  callerClient: TenantAuthorizationClient,
  tenantId: string,
): Promise<void> {
  const { data, error } = await callerClient.rpc('is_tenant_admin', {
    _tenant: tenantId,
  });
  // Missing RPC, malformed result and database failures all fail closed.
  if (error || data !== true) throw new IntegrationAccessError();
}

export interface StoredConnection {
  id: string;
  club_id: string;
  provider: string;
  display_name: string | null;
  status: string;
}

/** Project exact safe fields; never spread database/provider objects. */
export function publicConnection(connection: StoredConnection) {
  return {
    id: connection.id,
    provider: connection.provider,
    display_name: connection.display_name,
    status: connection.status,
  };
}

export async function requireConnectionAdmin(
  callerClient: TenantAuthorizationClient,
  storedConnection: StoredConnection,
) {
  await requireTenantAdmin(callerClient, storedConnection.club_id);
}

export function createOAuthState(now = Date.now()) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { state, expires_at: new Date(now + OAUTH_STATE_TTL_MS).toISOString() };
}