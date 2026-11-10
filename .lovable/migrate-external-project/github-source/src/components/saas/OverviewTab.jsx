import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Users, DollarSign, TrendingUp, ShieldCheck, UserCog, CreditCard, Settings, LifeBuoy, ArrowRight, Zap, ArrowLeftRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TONE_MAP = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
};

export default function OverviewTab({ clubs, plans, loading, onTabChange }) {
  const [userCount, setUserCount] = useState(null);
  const [migrationCount, setMigrationCount] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list("-created_date", 500).catch(() => []),
      base44.entities.MigrationJob.filter({ status: "support_review" }).catch(() => []),
    ]).then(([u, m]) => {
      setUserCount(u.length);
      setMigrationCount(m.length);
    });
  }, []);

  const activeClubs = clubs.filter((c) => c.status === "active" || c.status === "trialing");
  const trialClubs = clubs.filter((c) => c.status === "trialing");
  const mrr = clubs
    .filter((c) => c.subscription_status === "active")
    .reduce((sum, c) => {
      const plan = plans.find((p) => p.tier === c.plan_tier);
      return sum + (plan?.price_monthly || 0);
    }, 0);

  const stats = [
    { icon: Building2, label: "Total Clubs", value: clubs.length, tone: "indigo", tab: "tenants" },
    { icon: TrendingUp, label: "Active Clubs", value: activeClubs.length, tone: "emerald", tab: "tenants" },
    { icon: DollarSign, label: "MRR", value: `$${mrr.toFixed(0)}`, tone: "amber", tab: "billing" },
    { icon: UserCog, label: "Total Users", value: userCount ?? "…", tone: "cyan", tab: "users" },
  ];

  const quickLinks = [
    { icon: ArrowLeftRight, label: "Migrations", desc: "Review and approve club data imports", tab: "migrations", badge: migrationCount },
    { icon: ShieldCheck, label: "Manage Tenants", desc: "Create, suspend, change plans", tab: "tenants" },
    { icon: UserCog, label: "Manage Users", desc: "Roles, club assignment, invites", tab: "users" },
    { icon: CreditCard, label: "Billing", desc: "Purchases, subscriptions, MRR", tab: "billing" },
    { icon: Settings, label: "Configuration", desc: "Plans, pricing, features", tab: "config" },
    { icon: LifeBuoy, label: "Support Access", desc: "Logs, settings, club jump", tab: "support" },
  ];

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((s) => {
          const tone = TONE_MAP[s.tone];
          return (
            <Card key={s.label} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => onTabChange(s.tab)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone.bg} ${tone.text}`}>
                    <s.icon className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-500 font-medium">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((q) => (
            <Card key={q.label} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => onTabChange(q.tab)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <q.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-800">{q.label}</p>
                    {q.badge > 0 && <Badge className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700">{q.badge}</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{q.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent clubs */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Clubs</h3>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : clubs.length === 0 ? (
            <p className="text-sm text-slate-400">No clubs yet.</p>
          ) : (
            <div className="space-y-1">
              {clubs.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-xs font-bold text-slate-500">
                      {c.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{c.plan_tier} · {c.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.club_type === "trial" && <Badge className="text-[10px] bg-blue-50 text-blue-600">Trial</Badge>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.quickbooks_connected ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>
                      {c.quickbooks_connected ? "QB" : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}