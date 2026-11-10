import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { scopeDataToBranches } from "@/lib/seasonLifecycle";
import { computeBranchAlerts } from "@/lib/seasonAlerts";
import useLifecycleContext from "./useLifecycleContext";

const STYLE = {
  high: { icon: AlertTriangle, cls: "text-red-600", chip: "bg-red-50 border-red-200" },
  medium: { icon: AlertTriangle, cls: "text-amber-600", chip: "bg-amber-50 border-amber-200" },
  info: { icon: Info, cls: "text-blue-600", chip: "bg-blue-50 border-blue-200" },
};

/** Season Command Center alerts, grouped per branch. Each alert is clickable and
 *  links to the page where the admin can solve it. */
export default function SeasonAlertsPanel() {
  const { data, locations } = useLifecycleContext();
  const rows = locations.map((loc) => ({
    loc,
    alerts: computeBranchAlerts(scopeDataToBranches(data, new Set([loc.id]), false)),
  }));
  const withAlerts = rows.filter((r) => r.alerts.length);

  return (
    <Card className="border-border-subtle rounded-xl shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-bold tracking-wide">Season Alerts by Branch</CardTitle></CardHeader>
      <CardContent className="pt-0">
        {withAlerts.length === 0 ? (
          <p className="text-sm text-text-secondary flex items-center gap-2 py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No alerts. Every branch is on track.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {withAlerts.map(({ loc, alerts }) => (
              <div key={loc.id} className="rounded-lg border border-border-subtle bg-neutral-50 p-3 space-y-1.5">
                <p className="text-sm font-semibold">{loc.name}</p>
                {alerts.map((a) => {
                  const S = STYLE[a.severity]; const Icon = S.icon;
                  return (
                    <Link key={a.text} to={a.to} className="flex items-start gap-1.5 group hover:bg-background rounded-md p-1 -mx-1 transition-colors">
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${S.cls}`} />
                      <span className="text-xs flex-1">{a.text}</span>
                      <span className="text-[10px] font-semibold text-action opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 mt-0.5">
                        {a.actionLabel} <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}