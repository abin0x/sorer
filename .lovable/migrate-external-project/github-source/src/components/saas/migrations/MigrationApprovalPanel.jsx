import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X } from "lucide-react";

/**
 * System-owner approval panel for migration requests from clubs that already
 * have existing data. Approve → the club can proceed (status "draft"). Deny →
 * sent back to the club with a note (status "needs_fixes").
 */
export default function MigrationApprovalPanel({ job, clubName, onReviewed }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(null);

  const approve = async () => {
    setBusy("approve");
    try {
      await base44.functions.invoke('migrationRequests', { action: 'approve', migrationJobId: job.id, notes });
      toast({ title: "Migration approved", description: "The club can now proceed." });
      onReviewed();
    } catch (e) {
      toast({ title: "Failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const deny = async () => {
    setBusy("deny");
    try {
      await base44.functions.invoke('migrationRequests', { action: 'deny', migrationJobId: job.id, notes });
      toast({ title: "Migration denied" });
      onReviewed();
    } catch (e) {
      toast({ title: "Failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-lg">{clubName || job.club_name || "Club"}</h3>
        <p className="text-sm text-muted-foreground">Submitted by {job.requested_by_name || job.requested_by_email || 'an earlier account (requester not recorded)'}{job.requested_by_name && job.requested_by_email ? ` (${job.requested_by_email})` : ''}</p>
        <p className="text-xs text-slate-500">Migration request — this club already has data and needs your approval to proceed.</p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs text-amber-800">Approving lets the club upload files and run the migration. Denying sends it back with your note.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Note (shown to the club)</label>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Approved — you may proceed with the migration." />
      </div>

      <div className="flex gap-2">
        <Button onClick={approve} disabled={!!busy} className="gap-2 flex-1">
          {busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
        </Button>
        <Button onClick={deny} disabled={!!busy} variant="outline" className="gap-2 flex-1">
          {busy === "deny" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Deny
        </Button>
      </div>
    </div>
  );
}