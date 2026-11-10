import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Landmark, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function QboReconciliationTab() {
  const [openId, setOpenId] = useState(null);

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["qbo-payouts"],
    queryFn: () => base44.entities.StripePayout.list("-arrival_date", 100),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["qbo-payments-for-reconciliation"],
    queryFn: () => base44.entities.Payment.filter({ charge_type: "dues" }, "-created_date", 500).catch(() => []),
  });

  const blockedCount = payments.filter((p) => p.qbo_entry_type === "blocked").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading payouts…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blockedCount > 0 && (
        <Card className="adisal-card border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">
              <span className="font-semibold">{blockedCount}</span> payment{blockedCount === 1 ? "" : "s"} blocked from QuickBooks — map the missing team or branch on the Mapping tab.
            </p>
          </CardContent>
        </Card>
      )}

      {payouts.length === 0 && (
        <Card className="adisal-card">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No payouts recorded yet. Payouts appear here once Stripe pays out and the bank deposit is matched in QuickBooks.
          </CardContent>
        </Card>
      )}

      {payouts.map((payout) => {
        const isOpen = openId === payout.id;
        const linked = payments.filter((p) => payout.payment_ids?.includes(p.id));
        return (
          <Card key={payout.id} className="adisal-card">
            <CardContent className="p-0">
              <button
                className="w-full flex items-center justify-between gap-3 p-4 text-left"
                onClick={() => setOpenId(isOpen ? null : payout.id)}
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Landmark className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      ${Number(payout.amount || 0).toFixed(2)} payout — {payout.arrival_date ? format(new Date(payout.arrival_date), "MMM d, yyyy") : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{payout.payment_count || 0} payment(s) · ${Number(payout.fee_total || 0).toFixed(2)} fees</p>
                  </div>
                </div>
                <Badge className={payout.qbo_deposit_id ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                  {payout.qbo_deposit_id ? `QB Deposit #${payout.qbo_deposit_id}` : "Not yet in QuickBooks"}
                </Badge>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 p-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-slate-100">
                        <th className="py-1.5 pr-3 font-medium">Family</th>
                        <th className="py-1.5 pr-3 font-medium">Team</th>
                        <th className="py-1.5 pr-3 font-medium">Branch</th>
                        <th className="py-1.5 pr-3 font-medium">Gross</th>
                        <th className="py-1.5 pr-3 font-medium">Fee</th>
                        <th className="py-1.5 pr-3 font-medium">QB Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linked.map((p) => (
                        <tr key={p.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-1.5 pr-3">{p.guardian_name || "—"}</td>
                          <td className="py-1.5 pr-3">{p.team_name || "—"}</td>
                          <td className="py-1.5 pr-3">{p.branch_name || "—"}</td>
                          <td className="py-1.5 pr-3">${Number(p.amount || 0).toFixed(2)}</td>
                          <td className="py-1.5 pr-3">${Number(p.stripe_fee || 0).toFixed(2)}</td>
                          <td className="py-1.5 pr-3">{p.qbo_entry_id || "—"}</td>
                        </tr>
                      ))}
                      {linked.length === 0 && (
                        <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">No matching payments found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}