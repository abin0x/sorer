// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { isSystemAgent } from '../../shared/ticketHelpers.ts';

// Returns the full tenant context for a ticket: club name, plan, modules,
// branches, player count, Stripe/QuickBooks/email connection status,
// migration status, and recent failed payments or sync errors.
// Only callable by system agents (system owner/admin/support) or platform admins.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSystemAgent(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { club_id } = body;
    if (!club_id) return Response.json({ error: 'club_id required' }, { status: 400 });

    const db = base44.asServiceRole.entities;

    // Run independent queries in parallel batches
    const [club, branches, modules, players, creds, migrationJobs, tenantModules] = await Promise.all([
      db.Club.get(club_id).catch(() => null),
      db.Location.filter({ club_id }, { limit: 100 }).catch(() => ({ items: [] })),
      db.TenantModule.filter({ club_id }, { limit: 50 }).catch(() => ({ items: [] })),
      db.Player.count({ club_id }).catch(() => 0),
      db.ClubCredential.filter({ club_id }, { limit: 1 }).catch(() => ({ items: [] })),
      db.MigrationJob.filter({ club_id }, { sort: '-created_date', limit: 1 }).catch(() => ({ items: [] })),
      db.TenantModule.filter({ club_id, status: 'active' }, { limit: 50 }).catch(() => ({ items: [] })),
    ]);

    const branchItems = (branches as any).items || branches || [];
    const moduleItems = (modules as any).items || modules || [];
    const credItems = (creds as any).items || creds || [];
    const migrationItems = (migrationJobs as any).items || migrationJobs || [];
    const tenantModuleItems = (tenantModules as any).items || tenantModules || [];
    const cred = credItems[0] || {};

    // Recent failed payments (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
    const failedPayments = await db.Payment.filter({
      club_id,
      status: { $in: ['failed', 'refunded', 'disputed'] },
      created_date: { $gte: thirtyDaysAgo },
    }, { sort: '-created_date', limit: 10 }).catch(() => ({ items: [] }));
    const failedPaymentItems = (failedPayments as any).items || failedPayments || [];

    // Recent sync errors (StripeWebhookEvent with errors)
    const recentWebhookErrors = await db.StripeWebhookEvent.filter({
      club_id,
      status: 'failed',
    }, { sort: '-created_date', limit: 5 }).catch(() => ({ items: [] }));
    const webhookErrorItems = (recentWebhookErrors as any).items || recentWebhookErrors || [];

    const activeModuleKeys = tenantModuleItems.map((m: any) => m.module_key);

    const context = {
      club: {
        id: club?.id || club_id,
        name: club?.name || '',
        slug: club?.slug || '',
        subscription_plan: club?.subscription_plan || 'free',
        primary_color: club?.primary_color || '',
        created_date: club?.created_date || '',
      },
      branch_count: Array.isArray(branchItems) ? branchItems.length : 0,
      branches: (Array.isArray(branchItems) ? branchItems : []).map((b: any) => ({ id: b.id, name: b.name })),
      player_count: typeof players === 'number' ? players : 0,
      active_modules: activeModuleKeys,
      module_count: activeModuleKeys.length,
      connections: {
        stripe: {
          connected: !!(cred.stripe_secret_key),
          has_webhook_secret: !!(cred.stripe_webhook_secret),
        },
        quickbooks: {
          connected: !!(cred.quickbooks_client_id && cred.quickbooks_client_secret),
        },
        resend_email: {
          connected: !!(cred.resend_api_key),
        },
        ayrshare: {
          connected: !!(cred.ayrshare_api_key),
        },
        google_maps: {
          connected: !!(cred.google_maps_api_key),
        },
      },
      migration: {
        status: migrationItems[0]?.status || 'none',
        last_job_id: migrationItems[0]?.id || '',
        last_job_date: migrationItems[0]?.created_date || '',
      },
      recent_failures: {
        payments: (Array.isArray(failedPaymentItems) ? failedPaymentItems : []).map((p: any) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          date: p.created_date,
          description: p.description || '',
        })),
        webhook_errors: (Array.isArray(webhookErrorItems) ? webhookErrorItems : []).map((w: any) => ({
          id: w.id,
          event_type: w.event_type || w.type || '',
          error: w.error || w.error_message || '',
          date: w.created_date,
        })),
      },
    };

    return Response.json({ context });
  } catch (error) {
    console.error('ticket-tenant-context error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}