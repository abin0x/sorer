import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Deletes the authenticated user's own account and the personal data that
 * belongs to it (account-deletion requirement for app store review / GDPR).
 *
 * Removed: the account record itself, notification preferences, notifications,
 * role-onboarding records, and pending invitations for the address (revoked).
 * The login link is removed from any family (Guardian) record.
 *
 * Retained: club roster, registration and financial records — the club keeps
 * these for operational and legal reasons — but they are no longer tied to a
 * login. This function is the only self-service delete path; it elevates to
 * service role because the client SDK blocks self-delete.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const email = user.email;

    // Platform console accounts are managed from the SaaS console, never self-serve.
    if (user.is_super_admin === true || String(user.system_role || '').startsWith('system_')) {
      return Response.json(
        { error: 'Platform console accounts must be removed by another platform admin.' },
        { status: 403 }
      );
    }

    const svc = base44.asServiceRole;
    const purged: Record<string, unknown> = {};

    // A failure in one secondary purge must never block the account deletion itself.
    const purge = async (label: string, run: () => Promise<unknown>) => {
      try {
        purged[label] = await run();
      } catch (e) {
        console.error(`delete-account: ${label} failed:`, (e as Error)?.message || e);
        purged[label] = 'failed';
      }
    };

    if (email) {
      await purge('notifications', () => svc.entities.Notification.deleteMany({ user_email: email }));
      await purge('notification_preferences', () =>
        svc.entities.NotificationPreference.deleteMany({ user_email: email })
      );
      await purge('invitations_revoked', () =>
        svc.entities.ClubInvitation.updateMany({ email, status: 'pending' }, { $set: { status: 'revoked' } })
      );
    }

    await purge('notification_preferences_by_id', () =>
      svc.entities.NotificationPreference.deleteMany({ user_id: userId })
    );
    await purge('user_roles', () => svc.entities.UserRoles.deleteMany({ user_id: userId }));

    // Family records stay with the club (roster, registrations, payments) —
    // only the link to this login is removed.
    await purge('guardians_unlinked', async () => {
      const guardians = await svc.entities.Guardian.filter({ user_id: userId });
      for (const g of guardians) {
        await svc.entities.Guardian.update(g.id, { user_id: '' });
      }
      return guardians.length;
    });

    await svc.entities.User.delete(userId);

    return Response.json({ success: true, deleted: userId, purged });
  } catch (error) {
    console.error('delete-account error:', (error as Error)?.message || error);
    return Response.json(
      { error: (error as Error)?.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}