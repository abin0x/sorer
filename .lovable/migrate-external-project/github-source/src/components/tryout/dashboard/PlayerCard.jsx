import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StickyNote } from "lucide-react";
import { PaymentBadge, WaiverBadge, CheckInBadge, PoolBadge, RegBadge } from "@/components/tryout/dashboard/StatusChips";
import { playerAge, sessionText } from "@/lib/tryoutDashboard";

/** Phone-sized player card — same information as the table row. */
export default function PlayerCard({ reg, selected, onToggle, onOpen, onNote }) {
  const age = playerAge(reg);
  return (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={() => onToggle(reg.id)} aria-label={`Select ${reg.player_name}`} className="mt-1" />
        <button type="button" className="flex-1 text-left" onClick={() => onOpen(reg)}>
          <p className="font-medium">
            {Number(reg.bib_number) >= 1 && <span className="font-mono text-muted-foreground mr-1.5">#{reg.bib_number}</span>}
            {reg.player_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {age !== null ? `${age} yrs` : "Age unknown"} · {reg.player_gender || "—"}
            {reg.desired_age_group ? ` · ${reg.desired_age_group}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">{sessionText(reg)}</p>
          <p className="text-xs text-muted-foreground">{reg.guardian_name || reg.guardian_email || "No parent on file"}</p>
        </button>
        <Button size="sm" variant="ghost" onClick={() => onNote(reg)} aria-label="Add a note"><StickyNote className="w-4 h-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <RegBadge status={reg.status} />
        <PaymentBadge status={reg.payment_status} />
        <WaiverBadge status={reg.waiver_status} />
        <CheckInBadge reg={reg} />
        <PoolBadge status={reg.pool_status} />
      </div>
    </div>
  );
}