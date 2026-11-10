import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function TaskCompletionDialog({ open, onOpenChange, task, onCompleted }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  if (!task) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.RoadmapTask.update(task.id, {
        status: "completed",
        completed_date: new Date().toISOString(),
        completed_by: user?.email || "unknown",
        fulfillment_notes: notes,
      });
      if (task.kanban_program_id) {
        try {
          await base44.entities.Program.update(task.kanban_program_id, {
            status: "done",
            completed_date: new Date().toISOString().split("T")[0],
          });
          queryClient.invalidateQueries({ queryKey: ["programs"] });
        } catch (e) { /* linked program may have been removed */ }
      }
      toast.success(`Task ${task.task_number} marked fulfilled`);
      setNotes("");
      onOpenChange(false);
      if (onCompleted) onCompleted();
    } catch (e) {
      toast.error("Could not mark task fulfilled: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Confirm Task Fulfilled
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{task.task_number}</span> — {task.title}
          </p>
          <p className="text-xs text-muted-foreground">This signals that the project/task has been completed. It will be marked fulfilled with today's date and the linked Kanban card will move to Done.</p>
          <div>
            <Label className="text-xs">Fulfillment Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl min-h-[70px]" placeholder="What was done to fulfill this task…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? "Saving…" : "Mark Fulfilled"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}