import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DocumentViewer from "@/components/compliance/DocumentViewer";
import { FLAG_REASONS, bodyLabel, fmtDate, reqLabel } from "@/lib/compliance";

export default function ReviewDialog({ record, onClose, onDone }) {
  const [flagging, setFlagging] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const act = async (decision) => {
    setBusy(true);
    setError("");
    try {
      const text = reason === "Other" || !reason ? details : details ? `${reason}: ${details}` : reason;
      await base44.functions.invoke("compliance", { action: "review", record_id: record.id, decision, reason: text });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setBusy(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>Review: {record.coach_name} · {reqLabel(record.requirement_type)}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-5 gap-4">
          <div className="md:col-span-3 min-h-64"><DocumentViewer fileUri={record.document_url} fileName={record.document_name} /></div>
          <div className="md:col-span-2 space-y-4">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-slate-500">Completion date</dt><dd className="font-medium">{fmtDate(record.completion_date)}</dd></div>
              <div><dt className="text-slate-500">Governing body</dt><dd className="font-medium">{bodyLabel(record.governing_body)}</dd></div>
              <div><dt className="text-slate-500">Calculated expiration</dt><dd className="font-medium">{fmtDate(record.expiration_date)}</dd></div>
              <div><dt className="text-slate-500">Resubmissions</dt><dd className="font-medium">{record.resubmission_count || 0}</dd></div>
            </dl>
            {flagging ? (
              <div className="space-y-2">
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Reason for flagging" /></SelectTrigger>
                  <SelectContent>{FLAG_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea placeholder="Additional details (required for Other)" value={details} onChange={(e) => setDetails(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="destructive" disabled={busy || !reason || (reason === "Other" && !details)} onClick={() => act("flag")}>
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}Flag &amp; notify coach
                  </Button>
                  <Button variant="outline" onClick={() => setFlagging(false)}>Back</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => act("approve")}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}Approve</Button>
                <Button variant="outline" onClick={() => setFlagging(true)}>Flag</Button>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}