import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StickyNote } from "lucide-react";
import { PaymentBadge, WaiverBadge, CheckInBadge, PoolBadge, RegBadge } from "@/components/tryout/dashboard/StatusChips";
import { playerAge, sessionText } from "@/lib/tryoutDashboard";

/** One player on the pool/registration table. The row opens the full
 *  registration, the note button is a shortcut for staff comments. */
export default function PlayerTableRow({ reg, selected, onToggle, onOpen, onNote }) {
  const age = playerAge(reg);
  return (
    <TableRow className="cursor-pointer" onClick={() => onOpen(reg)}>
      <TableCell onClick={(e) => e.stopPropagation()} className="w-8">
        <Checkbox checked={selected} onCheckedChange={() => onToggle(reg.id)} aria-label={`Select ${reg.player_name}`} />
      </TableCell>
      <TableCell>
        <p className="font-medium text-sm">{reg.player_name}</p>
        <p className="text-xs text-muted-foreground">
          {reg.guardian_name || reg.guardian_email || "No parent on file"}
          {reg.desired_age_group ? ` · ${reg.desired_age_group}` : ""}
          {reg.admin_notes?.length ? ` · ${reg.admin_notes.length} note${reg.admin_notes.length === 1 ? "" : "s"}` : ""}
        </p>
      </TableCell>
      <TableCell className="text-sm">{age ?? "—"}</TableCell>
      <TableCell className="text-sm">{reg.player_gender || "—"}</TableCell>
      <TableCell className="text-sm font-mono">{Number(reg.bib_number) >= 1 ? reg.bib_number : "—"}</TableCell>
      <TableCell className="text-xs">{sessionText(reg)}</TableCell>
      <TableCell><PaymentBadge status={reg.payment_status} /></TableCell>
      <TableCell><WaiverBadge status={reg.waiver_status} /></TableCell>
      <TableCell><CheckInBadge reg={reg} /></TableCell>
      <TableCell><PoolBadge status={reg.pool_status} /></TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onNote(reg)} title="Add a note">
            <StickyNote className="w-4 h-4" />
          </Button>
          <RegBadge status={reg.status} />
        </div>
      </TableCell>
    </TableRow>
  );
}