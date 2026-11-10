import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REQUIREMENTS, reqLabel, fmtDate, bodyLabel } from "@/lib/compliance";

const MAX = 10 * 1024 * 1024;
const TYPES = ["application/pdf", "image/jpeg", "image/png"];

export default function UploadDialog({ open, onOpenChange, requirement, record, onDone }) {
  const [reqType, setReqType] = useState(requirement);
  const [date, setDate] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const flagged = record?.status === "flagged";

  const { data: preview } = useQuery({
    queryKey: ["complianceExpPreview", reqType, date],
    queryFn: async () => (await base44.functions.invoke("compliance", { action: "preview", requirement_type: reqType, completion_date: date })).data,
    enabled: !!date && !!reqType,
  });

  const pickFile = (f) => {
    setError("");
    if (!f) return setFile(null);
    if (!TYPES.includes(f.type)) return setError("Please upload a PDF, JPG, or PNG.");
    if (f.size > MAX) return setError("File must be 10 MB or smaller.");
    setFile(f);
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.functions.invoke("compliance", { action: "submit", requirement_type: reqType, completion_date: date, document_url: file_uri, document_name: file.name });
      onDone(reqType);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Upload failed");
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{flagged ? "Resubmit" : "Upload"} {reqLabel(reqType)}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {flagged && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
              <p className="font-semibold">Action required</p>
              <p>{record.admin_notes || "Your submission was flagged."}</p>
            </div>
          )}
          <div>
            <Label>Requirement</Label>
            <Select value={reqType} onValueChange={setReqType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REQUIREMENTS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="comp-date">Completion date (on the certificate)</Label>
            <Input id="comp-date" type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="comp-file">Certificate (PDF, JPG or PNG, max 10 MB)</Label>
            <Input id="comp-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => pickFile(e.target.files?.[0])} />
          </div>
          <div>
            <Label>Expiration date (auto-calculated)</Label>
            <Input readOnly value={preview?.expiration_date ? `${fmtDate(preview.expiration_date)} · ${bodyLabel(preview.governing_body)}` : date ? (preview && !preview.configured ? "Your club has no governing body set" : "Calculating…") : "Enter a completion date"} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || !date || !file || !preview?.configured} onClick={submit}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}Submit for review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}