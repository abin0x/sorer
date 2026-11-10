import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Gift, Ban, RefreshCw, AlertTriangle, CreditCard, XCircle, CheckCircle, Clock } from "lucide-react";
import { MODULE_STATUS_LABELS } from "@/lib/moduleAccess";

const ACTION_ICONS = {
  granted: CheckCircle,
  revoked: Ban,
  status_changed: RefreshCw,
  grace_extended: Clock,
  complimentary_granted: Gift,
  complimentary_revoked: Ban,
  sync_forced: RefreshCw,
  drift_detected: AlertTriangle,
  checkout_started: CreditCard,
  trial_started: Clock,
  payment_failed: AlertTriangle,
  payment_recovered: CheckCircle,
  cancellation_requested: XCircle,
  subscription_deleted: XCircle,
};

export default function EntitlementTimeline({ clubId, moduleKey }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["entitlementEvents", clubId, moduleKey],
    queryFn: () => {
      const filter = moduleKey
        ? { club_id: clubId, module_key: moduleKey }
        : { club_id: clubId };
      return base44.entities.EntitlementEvent.filter(filter, "-created_date", 50);
    },
    enabled: !!clubId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No events recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((ev) => {
        const Icon = ACTION_ICONS[ev.action] || RefreshCw;
        return (
          <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold capitalize">{ev.action.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">{ev.module_key}</span>
              </div>
              {ev.from_status && ev.to_status && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {MODULE_STATUS_LABELS[ev.from_status] || ev.from_status} → {MODULE_STATUS_LABELS[ev.to_status] || ev.to_status}
                </p>
              )}
              {ev.reason && <p className="text-xs text-muted-foreground mt-0.5">{ev.reason}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{ev.actor}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(ev.created_date).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}