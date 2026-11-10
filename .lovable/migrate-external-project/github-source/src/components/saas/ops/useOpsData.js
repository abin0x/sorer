import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Fetches the cross-tenant operational data the system-owner dashboard needs,
// in parallel, and computes per-club usage counts plus an urgent-alerts feed.
export function useOpsData(clubs) {
  const [data, setData] = useState({
    locations: [], players: [], teams: [], coaches: [], guardians: [],
    users: [], migrations: [], payments: [],
    counts: {}, alerts: [], loading: true, refreshedAt: null,
  });

  const refresh = useCallback(async () => {
    const [locations, players, teams, coaches, guardians, users, migrations, payments] = await Promise.all([
      base44.entities.Location.list("-created_date", 1000).catch(() => []),
      base44.entities.Player.list("-created_date", 2000).catch(() => []),
      base44.entities.Team.list("-created_date", 2000).catch(() => []),
      base44.entities.Coach.list("-created_date", 2000).catch(() => []),
      base44.entities.Guardian.list("-created_date", 2000).catch(() => []),
      base44.entities.User.list("-created_date", 1000).catch(() => []),
      base44.entities.MigrationJob.list("-created_date", 100).catch(() => []),
      base44.entities.Payment.list("-created_date", 200).catch(() => []),
    ]);

    const counts = {};
    const bump = (id, key, n = 1) => { counts[id] = counts[id] || {}; counts[id][key] = (counts[id][key] || 0) + n; };
    locations.forEach((l) => bump(l.club_id, "branches"));
    players.forEach((p) => bump(p.club_id, "players"));
    teams.forEach((t) => bump(t.club_id, "teams"));
    coaches.forEach((c) => bump(c.club_id, "coaches"));
    guardians.forEach((g) => bump(g.club_id, "guardians"));
    users.forEach((u) => { if (u.club_id) bump(u.club_id, "users"); });

    const latestMigration = {};
    migrations.forEach((m) => {
      if (!latestMigration[m.club_id] || new Date(m.created_date) > new Date(latestMigration[m.club_id].created_date)) {
        latestMigration[m.club_id] = m;
      }
    });

    const alerts = [];
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    migrations.forEach((m) => {
      if (m.status === "support_review") {
        alerts.push({ severity: "high", icon: "ArrowLeftRight", title: "Migration awaiting specialist review", subtitle: `${m.club_name || "A club"} — ready for Go-Live review`, tab: "migrations" });
      } else if (m.status === "needs_fixes") {
        alerts.push({ severity: "high", icon: "AlertTriangle", title: "Migration returned for fixes", subtitle: `${m.club_name || "A club"} — needs client attention`, tab: "migrations" });
      } else if (m.status === "processing" && m.commit_progress?.state === "error") {
        alerts.push({ severity: "critical", icon: "AlertOctagon", title: "Migration stalled on error", subtitle: `${m.club_name || "A club"} — ${m.commit_progress?.last_error || "unknown error"}`, tab: "migrations" });
      }
    });

    clubs.forEach((c) => {
      const u = counts[c.id] || {};
      const playerPct = c.max_players ? u.players / c.max_players : 0;
      const teamPct = c.max_teams ? u.teams / c.max_teams : 0;
      const branchPct = c.max_branches ? u.branches / c.max_branches : 0;
      if (playerPct >= 0.9 || teamPct >= 0.9 || branchPct >= 0.9) {
        alerts.push({ severity: "warn", icon: "Gauge", title: "Tenant nearing plan limit", subtitle: `${c.name} — players ${u.players}/${c.max_players}, teams ${u.teams}/${c.max_teams}`, clubId: c.id });
      }
      if (c.status === "suspended") {
        alerts.push({ severity: "warn", icon: "PauseCircle", title: "Tenant suspended", subtitle: `${c.name} — site offline`, clubId: c.id });
      }
      if (c.status === "past_due") {
        alerts.push({ severity: "high", icon: "CreditCard", title: "Tenant past due", subtitle: `${c.name} — billing needs attention`, clubId: c.id, tab: "billing" });
      }
      if (c.resend_domain_name && c.resend_domain_status !== "verified") {
        alerts.push({ severity: "warn", icon: "MailWarning", title: "Email domain not verified", subtitle: `${c.name} — ${c.resend_domain_name} (${c.resend_domain_status || "pending"})`, clubId: c.id });
      }
      if ((c.status === "active" || c.status === "trialing") && c.updated_date && now - Date.parse(c.updated_date) > thirtyDays) {
        alerts.push({ severity: "info", icon: "Moon", title: "Inactive for 30+ days", subtitle: `${c.name} — no recent activity`, clubId: c.id });
      }
    });

    const failedPayments = payments.filter((p) => p.status === "payment_failed");
    if (failedPayments.length) {
      alerts.push({ severity: "high", icon: "CreditCard", title: `${failedPayments.length} failed payment${failedPayments.length === 1 ? "" : "s"}`, subtitle: "Review and retry in the billing tab", tab: "billing" });
    }

    const order = { critical: 0, high: 1, warn: 2, info: 3 };
    alerts.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

    setData({ locations, players, teams, coaches, guardians, users, migrations, payments, counts, latestMigration, alerts, loading: false, refreshedAt: new Date().toISOString() });
  }, [clubs]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...data, refresh };
}