import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard, Receipt, Wallet, TrendingUp, AlertCircle, ArrowLeft,
  CheckCircle2, Clock, DollarSign, PartyPopper,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import OutstandingPaymentCard from "@/components/payments/OutstandingPaymentCard";

const STATUS_BADGE = {
  paid_in_full: { label: "Paid in Full", cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  active: { label: "Active", cls: "bg-blue-100 text-blue-700", icon: Clock },
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700", icon: Clock },
  past_due: { label: "Past Due", cls: "bg-rose-100 text-rose-700", icon: AlertCircle },
  partial: { label: "Partial", cls: "bg-amber-100 text-amber-700", icon: Clock },
  refunded: { label: "Refunded", cls: "bg-slate-100 text-slate-600", icon: DollarSign },
};

export default function FamilyAccount() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: guardians = [] } = useQuery({
    queryKey: ["family-account-guardians"],
    queryFn: () => base44.entities.Guardian.list("-created_date", 100),
  });
  const me = user?.guardian_id
    ? guardians.find((g) => g.id === user.guardian_id)
    : guardians.find((g) => g.email?.toLowerCase() === user?.email?.toLowerCase())
    || guardians[0];

  const { data: players = [] } = useQuery({
    queryKey: ["family-account-players"],
    queryFn: () => base44.entities.Player.list("-created_date", 200),
  });
  const myChildren = me ? players.filter((p) => p.guardian_id === me.id) : [];

  const { data: registrations = [] } = useQuery({
    queryKey: ["family-account-regs"],
    queryFn: () => base44.entities.Registration.list("-created_date", 200),
  });
  const myRegs = myChildren.map((c) => registrations.find((r) => r.player_id === c.id)).filter(Boolean);

  const { data: payments = [] } = useQuery({
    queryKey: ["family-account-payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 200),
  });
  const myPlayerIds = myChildren.map((c) => c.id);
  const myPayments = payments.filter((p) => myPlayerIds.includes(p.player_id) || p.source_id === me?.id);

  const totalDue = myRegs.reduce((s, r) => s + (r.amount_due || 0), 0);
  const totalPaid = myRegs.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const totalOutstanding = totalDue - totalPaid;
  const paymentPct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  // Outstanding balances first — past due, then by amount owed descending.
  const outstandingRegs = myRegs
    .filter((r) => (r.amount_due || 0) - (r.amount_paid || 0) > 0)
    .sort((a, b) => {
      const aPastDue = a.payment_status === "past_due" ? 1 : 0;
      const bPastDue = b.payment_status === "past_due" ? 1 : 0;
      if (aPastDue !== bPastDue) return bPastDue - aPastDue;
      return ((b.amount_due || 0) - (b.amount_paid || 0)) - ((a.amount_due || 0) - (a.amount_paid || 0));
    });

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Back link */}
      <Link to={createPageUrl("RoleDashboard")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="glass-wellness rounded-3xl p-6 lg:p-8 soft-shadow-lg animate-fadeInUp">
        <p className="text-sm text-muted-foreground font-medium">Family Account</p>
        <h1 className="text-3xl font-bold text-foreground mt-1">
          {me ? `${me.first_name} ${me.last_name}'s Account` : "Family Account"}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Track all registrations, payments, and financial activity for your family in one place.
        </p>
      </div>

      {/* Outstanding payments — the thing families came here to resolve, shown first */}
      <div className="animate-fadeInUp">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <h2 className="text-lg font-bold text-foreground">
            {outstandingRegs.length > 0 ? "Outstanding Payments" : "Payments"}
          </h2>
          {outstandingRegs.length > 0 && (
            <Badge className="bg-rose-100 text-rose-700">{outstandingRegs.length}</Badge>
          )}
        </div>
        {outstandingRegs.length === 0 ? (
          <Card className="soft-shadow border-border/60">
            <CardContent className="p-6 flex items-center gap-3">
              <PartyPopper className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-foreground font-medium">You're all caught up — no outstanding balances.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {outstandingRegs.map((reg) => (
              <OutstandingPaymentCard key={reg.id} reg={reg} child={myChildren.find((c) => c.id === reg.player_id)} />
            ))}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="soft-shadow border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">${totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="soft-shadow border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Total Due</span>
            </div>
            <p className="text-2xl font-bold text-foreground">${totalDue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="soft-shadow border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span className="text-xs text-muted-foreground">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-rose-600">${totalOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="soft-shadow border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Progress</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{paymentPct}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment progress bar */}
      {totalDue > 0 && (
        <Card className="soft-shadow border-border/60 animate-fadeInUp">
          <CardContent className="p-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-foreground">Overall Payment Progress</span>
              <span className="text-muted-foreground">${totalPaid} of ${totalDue}</span>
            </div>
            <Progress value={paymentPct} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* All registrations — compact, secondary to the outstanding list above */}
      <Card className="soft-shadow border-border/60 animate-fadeInUp">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> All Registrations</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {myRegs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No registrations on file yet.</p>
          ) : (
            myRegs.map((reg) => {
              const child = myChildren.find((c) => c.id === reg.player_id);
              const badge = STATUS_BADGE[reg.payment_status] || STATUS_BADGE.pending;
              const BadgeIcon = badge.icon;
              const outstanding = (reg.amount_due || 0) - (reg.amount_paid || 0);
              return (
                <div key={reg.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{child ? `${child.first_name} ${child.last_name}` : "Player"}</p>
                    <p className="text-xs text-muted-foreground truncate">{reg.program_title || "Program"}{reg.location_name ? ` · ${reg.location_name}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">${reg.amount_paid || 0} / ${reg.amount_due || 0}</p>
                      {outstanding > 0 && <p className="text-xs text-rose-600">${outstanding} owed</p>}
                    </div>
                    <Badge className={`${badge.cls} text-xs gap-1`}>
                      <BadgeIcon className="w-3 h-3" /> {badge.label}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card className="soft-shadow border-border/60 animate-fadeInUp">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" /> Transaction History</CardTitle></CardHeader>
        <CardContent>
          {myPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No transactions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {myPayments.map((pmt) => (
                <div key={pmt.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {pmt.source_label || pmt.player_name || "Payment"}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {pmt.payment_date && <span>{pmt.payment_date}</span>}
                      {pmt.processor_name && <span>· {pmt.processor_name}</span>}
                      {pmt.payment_method && <span className="capitalize">· {pmt.payment_method}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-foreground">${pmt.amount?.toLocaleString() || 0}</p>
                    <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">{pmt.status?.replace(/_/g, " ")}</Badge>
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