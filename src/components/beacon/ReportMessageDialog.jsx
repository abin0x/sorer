import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag, Loader2 } from "lucide-react";

const REASONS = [
  { key: "safety", label: "Safety concern for a player" },
  { key: "inappropriate", label: "Inappropriate or offensive" },
  { key: "bullying", label: "Bullying or harassment" },
  { key: "privacy", label: "Shares private information" },
  { key: "spam", label: "Spam or off-topic" },
];

export default function ReportMessageDialog({ open, onOpenChange, onSubmit }) {
  const [reason, setReason] = useState("safety");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try { await onSubmit({ reason, details: details.trim() }); setDetails(""); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flag className="w-4 h-4 text-destructive" /> Report message</DialogTitle>
          <DialogDescription>Only club admins see reports. Two reports hide the message until it's reviewed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {REASONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setReason(r.key)}
              className={`text-left text-sm rounded-xl border px-3 py-2.5 transition-colors ${reason === r.key ? "border-destructive bg-destructive/10 font-medium" : "border-border hover:bg-muted"}`}
            >
              {r.label}
            </button>
          ))}
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything else the club should know? (optional)" rows={2} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
