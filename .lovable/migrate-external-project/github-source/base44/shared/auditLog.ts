// Shared audit-logging helper used by connection/disconnect/sync backend functions.
// Always writes with the service role so a record's club_id can never be spoofed by the caller.
// NEVER pass raw tokens/secrets in `metadata` — this is a visible admin-facing log.

export async function logAudit(
  base44: any,
  {
    club_id,
    user,
    action,
    entity_type,
    entity_id,
    metadata,
  }: {
    club_id?: string | null;
    user?: { id?: string; email?: string } | null;
    action: string;
    entity_type?: string;
    entity_id?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      club_id: club_id || undefined,
      user_id: user?.id,
      user_email: user?.email,
      action,
      entity_type,
      entity_id,
      metadata: metadata || {},
    });
  } catch (err) {
    // Audit logging must never break the primary operation.
    console.error('audit log write failed:', err);
  }
}