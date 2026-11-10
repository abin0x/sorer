// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Build tenant health snapshots and return dashboard data. System owner /
// admin only. Computes a health score per club from open issues, failed
// payments, failed syncs, stalled migrations, and top errors.
//
// Payload: { action: "build"|"dashboard"|"club" , club_id? }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const isOwner = user.role === "admin" || ["system_owner", "system_admin", "system_support"].includes(user.system_role);
    if (!isOwner) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action = "dashboard", club_id } = body;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    if (action === "club") {
      return Response.json({ status: "ok", snapshot: await buildSnapshot(base44, club_id) });
    }

    // build / dashboard: compute for all clubs
    const clubs = await base44.asServiceRole.entities.Club.filter({}, null, 200);
    const snapshots = [];
    for (const club of clubs) {
      snapshots.push(await buildSnapshot(base44, club.id, club.name));
    }

    if (action === "build") {
      // persist latest snapshot per club (upsert by club_id)
      for (const s of snapshots) {
        try {
          const existing = await base44.asServiceRole.entities.TenantHealthSnapshot.filter({ club_id: s.club_id }, "-snapshot_date", 1);
          if (existing.length) await base44.asServiceRole.entities.TenantHealthSnapshot.update(existing[0].id, s);
          else await base44.asServiceRole.entities.TenantHealthSnapshot.create(s);
        } catch (e) {}
      }
    }

    // Dashboard summary
    const needsAttention = snapshots.filter((s) => s.needs_attention).sort((a, b) => a.health_score - b.health_score);
    const openIssues = await base44.asServiceRole.entities.Issue.filter({ status: { $in: ["new", "investigating", "mitigated"] } }, "-last_seen", 100);
    const activeIncidents = await base44.asServiceRole.entities.Incident.filter({ status: { $ne: "resolved" } }, "-start_time", 20);

    return Response.json({
      status: "ok",
      snapshots: snapshots.sort((a, b) => a.health_score - b.health_score),
      needs_attention: needsAttention,
      open_issues: openIssues,
      active_incidents: activeIncidents,
      totals: {
        clubs: snapshots.length,
        needs_attention: needsAttention.length,
        open_issues: openIssues.length,
        open_p1_p2: openIssues.filter((i) => i.severity === "P1" || i.severity === "P2").length,
        active_incidents: activeIncidents.length,
        avg_health: snapshots.length ? Math.round(snapshots.reduce((s, x) => s + x.health_score, 0) / snapshots.length) : 100,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function buildSnapshot(base44, clubId, clubName) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (!clubName) {
    try { const c = await base44.asServiceRole.entities.Club.get(clubId); clubName = c?.name || "Unknown"; } catch (e) { clubName = "Unknown"; }
  }

  const [openIssues, failedPayments, failedSyncs, stalledMigrations, topErrorsAgg] = await Promise.all([
    base44.asServiceRole.entities.Issue.filter({ club_id: clubId, status: { $in: ["new", "investigating", "mitigated"] } }, null, 100),
    base44.asServiceRole.entities.Payment.filter({ club_id: clubId, status: "failed", created_date: { $gte: since } }, null, 1).catch(() => ({ items: [] })),
    base44.asServiceRole.entities.Issue.filter({ club_id: clubId, signal_type: "quickbooks_sync", last_seen: { $gte: since } }, null, 100),
    base44.asServiceRole.entities.MigrationJob.filter({ club_id: clubId, status: { $in: ["stalled", "failed", "partly_processed"] } }, null, 50).catch(() => ({ items: [] })),
    base44.asServiceRole.entities.Issue.aggregate({ query: { club_id: clubId, status: { $in: ["new", "investigating", "mitigated"] } }, groupBy: "signal_type", sort: "-count", limit: 10 }).catch(() => ({ rows: [] })),
  ]);

  const openP1P2 = openIssues.filter((i) => i.severity === "P1" || i.severity === "P2").length;
  const failedSyncCount = failedSyncs.length;
  const stalledCount = stalledMigrations.items ? stalledMigrations.items.length : (stalledMigrations.length || 0);
  const failedPayCount = Array.isArray(failedPayments) ? failedPayments.length : (failedPayments.items ? failedPayments.items.length : 0);

  // Health score: start 100, deduct by severity
  let score = 100;
  for (const i of openIssues) {
    if (i.severity === "P1") score -= 25;
    else if (i.severity === "P2") score -= 12;
    else if (i.severity === "P3") score -= 5;
    else score -= 2;
  }
  score -= Math.min(failedPayCount * 2, 20);
  score -= Math.min(failedSyncCount * 5, 15);
  score -= Math.min(stalledCount * 8, 16);
  score = Math.max(0, Math.min(100, score));

  const topErrors = (topErrorsAgg.rows || []).map((r) => ({ title: r.signal_type, count: r.count, signal_type: r.signal_type }));

  return {
    club_id: clubId,
    club_name: clubName,
    snapshot_date: new Date().toISOString(),
    health_score: score,
    open_issues_count: openIssues.length,
    open_p1_p2_count: openP1P2,
    failed_payments_24h: failedPayCount,
    failed_syncs_24h: failedSyncCount,
    stalled_migrations: stalledCount,
    top_errors: topErrors,
    needs_attention: score < 80 || openP1P2 > 0,
    metrics: { open_by_severity: countBySeverity(openIssues) },
  };
}

function countBySeverity(issues) {
  const m = { P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const i of issues) m[i.severity] = (m[i.severity] || 0) + 1;
  return m;
}