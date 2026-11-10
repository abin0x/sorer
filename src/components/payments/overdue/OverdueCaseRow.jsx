import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, ChevronRight, Loader2, CalendarClock, User } from "lucide-react";
import { STATUS_META, BUCKET_META, money, formatDay } from "./caseStyles";

/** One payer account in the overdue queue, with the two actions used most. */
export default function OverdueCaseRow({ caseRecord, onOpen, onRemind, reminding }) {
  const status = STATUS_META[caseRecord.status] || STATUS_META.open;
  const bucket = BUCKET_META[caseRecord.aging_bucket] || BUCKET_META["0-30"];
  const missed = caseRecord.late_payment_count || 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 surface-tile rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-text-primary truncate">
            {caseRecord.player_name || "Unnamed account"}
          </span>
          <Badge variant="outline" className={`text-[10px] ${bucket.className}`}>{bucket.label}</Badge>
          <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {caseRecord.guardian_name || "No guardian on file"}
          {caseRecord.family_email ? ` · ${caseRecord.family_email}` : ""}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {missed} missed payment{missed === 1 ? "" : "s"} since {formatDay(caseRecord.due_date)}
          {caseRecord.team_name ? ` · ${caseRecord.team_name}` : ""}
          {caseRecord.branch_name ? ` · ${caseRecord.branch_name}` : ""}
        </p>
        {(caseRecord.assigned_to || caseRecord.next_follow_up) && (
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
            {caseRecord.assigned_to && (
              <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{caseRecord.assigned_name || caseRecord.assigned_to}</span>
            )}
            {caseRecord.next_follow_up && (
              <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" />Follow up {formatDay(caseRecord.next_follow_up)}</span>
            )}
            {caseRecord.reminder_count > 0 && <span>{caseRecord.reminder_count} reminder{caseRecord.reminder_count === 1 ? "" : "s"} sent</span>}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-text-primary">{money(caseRecord.amount_outstanding)}</p>
          <p className="text-[10px] text-muted-foreground">{caseRecord.days_overdue} days overdue</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={reminding || !caseRecord.family_email}
            title={caseRecord.family_email ? "Email a payment reminder" : "No family email on file"}
            onClick={() => onRemind(caseRecord)}
          >
            {reminding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" className="rounded-xl" onClick={() => onOpen(caseRecord)}>
            Resolve <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}