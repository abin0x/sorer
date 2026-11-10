import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ArrowRight, Loader2 } from "lucide-react";

export default function MoveConfirmDialog({ moveConfirm, onCancel, onConfirm, saving }) {
  if (!moveConfirm) return null;
  const { event, fromField, toField } = moveConfirm;

  return (
    <Dialog open={!!moveConfirm} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Move</DialogTitle>
          <DialogDescription>Move this booking to a different field?</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <p className="font-semibold text-foreground">{event.team_names?.filter(Boolean).join(" vs ") || event.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(parseISO(event.start_datetime), "EEE, MMM d · h:mm a")}
              {event.end_datetime ? ` – ${format(parseISO(event.end_datetime), "h:mm a")}` : ""}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="text-center">
              <p className="text-[10px] uppercase text-muted-foreground">From</p>
              <p className="font-semibold text-foreground">{fromField?.name}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="text-center">
              <p className="text-[10px] uppercase text-muted-foreground">To</p>
              <p className="font-semibold text-emerald-700">{toField?.name}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The team calendar has already been updated for this booking — you may want to re-notify affected players, coaches, and parents after moving it.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}