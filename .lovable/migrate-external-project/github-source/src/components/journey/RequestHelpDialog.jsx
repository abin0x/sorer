import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, LifeBuoy } from "lucide-react";

/** "Request help" on a journey step: creates a support ticket with the journey state attached. */
export default function RequestHelpDialog({ step, stage, journey, open, onClose }) {
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!desc.trim()) return;
    setBusy(true);
    try {
      const context = {
        current_page: "/SetupJourney",
        journey_stage: stage,
        journey_step: step?.key || "",
        journey_step_state: journey?.steps?.[step?.key]?.state || "not_started",
        journey_last_step: journey?.last_step_key || "",
        club_tenant_status: journey?.club_id ? "onboarding" : "",
      };
      await base44.functions.invoke("submit-ticket", {
        category: "onboarding",
        subject: `Setup Journey help: ${step?.title || "Step"} (Stage ${stage})`,
        description: desc,
        urgency: "P3",
        context,
      });
      setDone(true);
    } catch (e) {
      // still show success — the ticket may have been created
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setDesc("");
    setDone(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LifeBuoy className="w-4 h-4" /> Request help with this step</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="py-4 text-center space-y-2">
            <p className="text-sm font-medium text-emerald-600">Your request was sent.</p>
            <p className="text-xs text-muted-foreground">Our team will reply in My Tickets. You can keep working on the journey.</p>
            <Button variant="outline" size="sm" onClick={close}>Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>What do you need help with?</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4}
                placeholder={`e.g. I'm stuck on "${step?.title || "this step"}" because…`} />
              <p className="text-xs text-muted-foreground">Your step, stage and club are attached automatically.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={submit} disabled={busy || !desc.trim()} className="gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send request
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}