import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronRight, Loader2, RefreshCw, CheckCircle2, Send, Wallet } from "lucide-react";
import { createPageUrl } from "@/utils";
import useOverdueCases from "./useOverdueCases";
import { BUCKET_META, money, formatDay } from "./caseStyles";

const BUCKETS = ["0-30", "31-60", "61-90", "90+"];
const CASE_PREVIEW = 4;
const QUEUE_URL = `${createPageUrl("PaymentSettings")}?tab=overdue`;

/** Bookkeeper dashboard widget: the collection backlog and the fastest way into it. */
export default function OverdueResolutionWidget() {
  const { cases, summary, isLoading, isFetching, refetch, runAction, clubId } = useOverdueCases();
  const [remindingId, setRemindingId] = useState(null);

  const remind = async (caseRecord) => {
    setRemindingId(caseRecord.id);
    try {
      await runAction("reminder", { case_id: caseRecord.id });
      toast.success(`Reminder sent to ${caseRecord.family_email}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Reminder could not be sent.");
    } finally {
      setRemindingId(null);
    }
  };

  const header = (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-rose-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">Overdue payment resolutions</p>
          <p className="text-[11px] text-muted-foreground">Late and missed payments, worked one family at a time</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="rounded-xl" disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
        <Button asChild size="sm" className="rounded-xl">
          <Link to={QUEUE_URL}>Resolution queue <ChevronRight className="w-3.5 h-3.5 ml-1" /></Link>
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="border-border-subtle rounded-xl">
        <CardContent className="p-4 space-y-3">
          {header}
          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        </CardContent>
      </Card>
    );
  }

  if (!clubId || !summary || summary.openCases === 0) {
    return (
      <Card className="border-border-subtle rounded-xl">
        <CardContent className="p-4 space-y-3">
          {header}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">
              {clubId ? "No late or missed payments — every family account is up to date." : "Select a club to see its overdue payments."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border-subtle rounded-xl">
      <CardContent className="p-4 space-y-3">
        {header}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
            <p className="text-lg font-extrabold text-rose-700">{money(summary.totalOutstanding)}</p>
            <p className="text-[10px] text-text-secondary">Outstanding</p>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-50 border border-border-subtle text-center">
            <p className="text-lg font-extrabold text-text-primary">{summary.openCases}</p>
            <p className="text-[10px] text-text-secondary">Open cases</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <p className="text-lg font-extrabold text-amber-700">{summary.inProgress}</p>
            <p className="text-[10px] text-text-secondary">Being worked</p>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-50 border border-border-subtle text-center">
            <p className="text-lg font-extrabold text-text-primary">{summary.followUpsDue}</p>
            <p className="text-[10px] text-text-secondary">Follow-ups due</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {BUCKETS.map((b) => (
            <Badge key={b} variant="outline" className={`text-[10px] ${BUCKET_META[b].className}`}>
              {BUCKET_META[b].label}: {summary.buckets?.[b]?.count || 0} · {money(summary.buckets?.[b]?.amount || 0)}
            </Badge>
          ))}
          {summary.unassigned > 0 && (
            <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
              {summary.unassigned} unassigned
            </Badge>
          )}
        </div>

        {cases.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-text-secondary">Longest overdue</p>
            {cases.slice(0, CASE_PREVIEW).map((c) => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-1 border border-border-subtle">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate">
                    {c.player_name || "Unnamed account"}
                    <span className="font-normal text-muted-foreground"> · {c.days_overdue} days</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {money(c.amount_outstanding)} · {c.late_payment_count} missed · oldest due {formatDay(c.due_date)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg shrink-0"
                  disabled={remindingId === c.id || !c.family_email}
                  title={c.family_email ? "Email a payment reminder" : "No family email on file"}
                  onClick={() => remind(c)}
                >
                  {remindingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-lg shrink-0">
                  <Link to={QUEUE_URL}>Resolve</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}