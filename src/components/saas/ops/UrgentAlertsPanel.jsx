import React from "react";
import { CheckCircle2, Bell, ArrowLeftRight, AlertTriangle, AlertOctagon, Gauge, PauseCircle, CreditCard, MailWarning, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ICONS = { ArrowLeftRight, AlertTriangle, AlertOctagon, Gauge, PauseCircle, CreditCard, MailWarning, Moon, Bell };

const SEVERITY = {
  critical: { ring: "border-rose-200 bg-rose-50/50", label: "Critical", labelCls: "bg-rose-100 text-rose-700", icon: "text-rose-600" },
  high: { ring: "border-amber-200 bg-amber-50/50", label: "High", labelCls: "bg-amber-100 text-amber-700", icon: "text-amber-600" },
  warn: { ring: "border-sky-200 bg-sky-50/50", label: "Watch", labelCls: "bg-sky-100 text-sky-700", icon: "text-sky-600" },
  info: { ring: "border-slate-200 bg-slate-50/50", label: "Info", labelCls: "bg-slate-100 text-slate-600", icon: "text-slate-400" },
};

// Urgent-alerts feed: triage queue of things needing a system owner's attention.
export default function UrgentAlertsPanel({ alerts, loading, onSelectTenant, onTabChange }) {
  const resolve = (a) => {
    if (a.tab) return () => onTabChange(a.tab);
    if (a.clubId) return () => onSelectTenant(a.clubId);
    return null;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Urgent Alerts</h3>
          {!loading && <Badge variant="outline" className="text-[10px]">{alerts.length} open</Badge>}
        </div>
        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Scanning tenants…</p>
        ) : alerts.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-medium text-slate-600">All clear</p>
            <p className="text-xs text-slate-400">No urgent tenant issues right now.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {alerts.map((a, i) => {
              const s = SEVERITY[a.severity] || SEVERITY.info;
              const Icon = ICONS[a.icon] || Bell;
              const action = resolve(a);
              return (
                <button key={i} onClick={action || undefined} disabled={!action} className={`w-full text-left p-2.5 rounded-lg border ${s.ring} ${action ? "hover:shadow-sm cursor-pointer" : "cursor-default"} flex items-start gap-2.5`}>
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.icon}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{a.title}</p>
                    <p className="text-xs text-slate-500 truncate">{a.subtitle}</p>
                  </div>
                  <Badge className={`text-[9px] h-4 px-1 shrink-0 ${s.labelCls}`}>{s.label}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}