import React from "react";
import { Plus, ArrowLeftRight, CreditCard, LifeBuoy, Search, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isSystemOwner, SYSTEM_ROLE_LABELS, getSystemRole } from "@/lib/rbac";

// Action-driven top bar: the most critical, count-badged actions come first.
// Provision is the primary owner action; review queues surface counts.
export default function CriticalActionsBar({ user, clubs, alerts, onProvision, onTabChange, onFocusSearch }) {
  const owner = isSystemOwner(user) || user?.role === "admin";
  const roleLabel = getSystemRole(user) ? SYSTEM_ROLE_LABELS[getSystemRole(user)] : "System Owner";

  const reviewMigrations = alerts.filter((a) => a.tab === "migrations").length;
  const failedPayments = alerts.filter((a) => a.tab === "billing").length;

  const primary = [
    { icon: Plus, label: "Provision Club", desc: "Create a tenant and invite its first admin", onClick: onProvision, tone: "primary", owner: true },
    { icon: ArrowLeftRight, label: "Review Migrations", desc: "Specialist review & Go-Live queue", onClick: () => onTabChange("migrations"), badge: reviewMigrations, tone: "critical", owner: true },
    { icon: CreditCard, label: "Failed Payments", desc: "Retry or reconcile failed charges", onClick: () => onTabChange("billing"), badge: failedPayments, tone: "critical" },
    { icon: LifeBuoy, label: "Support Tickets", desc: "Open tenant support requests", onClick: () => onTabChange("tickets"), tone: "neutral" },
    { icon: Search, label: "Find a Tenant", desc: "Search the full tenant directory", onClick: onFocusSearch, tone: "neutral" },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-800">Critical Actions</h2>
            <Badge variant="outline" className="text-[10px] font-semibold">{roleLabel}</Badge>
          </div>
          <span className="text-xs text-slate-400">{clubs.filter((c) => c.status !== "archived").length} active tenants</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {primary.map((a) => {
            const disabled = a.owner && !owner;
            const tone = disabled ? "opacity-50" : a.tone === "primary" ? "border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90" : a.tone === "critical" ? "border-rose-200 bg-white hover:border-rose-300" : "border-slate-200 bg-white hover:border-slate-300";
            return (
              <button key={a.label} onClick={a.onClick} disabled={disabled} className={`group text-left p-3 rounded-xl border transition-all ${tone} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <a.icon className={`w-4 h-4 ${a.tone === "primary" ? "text-primary-foreground" : a.tone === "critical" ? "text-rose-600" : "text-slate-500"}`} />
                  {!!a.badge && a.badge > 0 && <Badge className="text-[10px] h-5 px-1.5 bg-rose-100 text-rose-700">{a.badge}</Badge>}
                </div>
                <p className={`text-xs font-bold ${a.tone === "primary" ? "text-primary-foreground" : "text-slate-800"}`}>{a.label}</p>
                <p className={`text-[11px] leading-tight mt-0.5 ${a.tone === "primary" ? "text-primary-foreground/80" : "text-slate-400"}`}>{a.desc}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}