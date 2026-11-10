import React from "react";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronRight, Siren, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { createPageUrl } from "@/utils";
import useOverdueCases from "@/components/payments/overdue/useOverdueCases";
import { useLatestPlayerRetention } from "@/hooks/useLatestPlayerRetention";
import { buildTriageItems } from "@/lib/triageBriefing";

const PRESETS = {
  admin: { overdue: true, retention: true, expenses: true },
  director: { overdue: true, retention: true, expenses: true },
  bookkeeper: { overdue: true, retention: false, expenses: true },
};

/** Morning briefing: the few things that need attention today, at the top of a dashboard. */
export default function TriageBriefing({ variant = "admin" }) {
  const include = PRESETS[variant] || PRESETS.admin;
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const overdue = useOverdueCases();
  const retention = useLatestPlayerRetention();
  const expenses = useQuery({
    queryKey: ["triage-pending-expenses", clubId],
    enabled: !!clubId && include.expenses,
    queryFn: async () => (await base44.entities.Expense.list("-created_date", 300)).filter((e) => e.status === "pending"),
    staleTime: 60 * 1000,
  });

  const PAY = createPageUrl("PaymentSettings");
  const items = buildTriageItems({
    include,
    overdue: overdue.summary,
    retentionMap: retention.data?.map,
    retentionAllowed: retention.allowed,
    pendingExpenses: expenses.data || [],
    links: {
      overdue: `${PAY}?tab=overdue`,
      retention: "/tryoutdashboard",
      expenses: `${createPageUrl("ExpenseApprovals")}?view=approvals`,
    },
  });
  const loading = overdue.isLoading || (include.retention && retention.isLoading) || expenses.isLoading;
  const critical = items.some((i) => i.severity === "critical");
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <section aria-label="Today's briefing" className={`rounded-2xl border-2 p-4 lg:p-5 shadow-sm ${critical ? "border-destructive/40 bg-destructive/5" : items.length ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${critical ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
            {critical ? <Siren className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="text-base lg:text-lg font-bold text-foreground leading-tight">Today's briefing</h2>
            <p className="text-xs text-muted-foreground">{today}</p>
          </div>
        </div>
        {!loading && items.length > 0 && (
          <span className="text-xs font-semibold rounded-full bg-background border border-border px-2.5 py-1 text-foreground">
            {items.length} need{items.length === 1 ? "s" : ""} attention
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking payments, players and approvals…</div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-foreground py-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          {overdue.error ? "Nothing else flagged — overdue payments couldn't be checked right now." : "All clear. Nothing urgent needs you today."}
        </div>
      ) : (
        <ul className="grid gap-2 md:grid-cols-3">
          {items.map((item) => (
            <li key={item.key}>
              <Link to={item.to} className="group flex h-full items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-muted/50">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.severity === "critical" ? "bg-destructive" : "bg-primary"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-primary">
                  {item.cta}<ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
