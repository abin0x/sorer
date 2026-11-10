import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCheck, Loader2 } from "lucide-react";
import { CONTACT_CHANNELS } from "./caseStyles";

/** Logs an attempt to reach the family, and optionally who owns it and when to follow up. */
export default function ContactLogForm({ caseRecord, currentUser, onSubmit, busy }) {
  const [channel, setChannel] = useState("call");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState(caseRecord.next_follow_up || "");
  const [assignToMe, setAssignToMe] = useState(!caseRecord.assigned_to);

  const submit = () => onSubmit({
    channel,
    note,
    next_follow_up: followUp || undefined,
    assigned_to: assignToMe ? currentUser?.email : undefined,
    assigned_name: assignToMe ? (currentUser?.full_name || currentUser?.email) : undefined,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">How you contacted them</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTACT_CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Follow up on (optional)</Label>
          <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="rounded-xl" />
        </div>
      </div>
      <div>
        <Label className="text-xs">What happened</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl min-h-[60px]" placeholder="Left a voicemail, will try again Thursday…" />
      </div>

      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input type="checkbox" checked={assignToMe} onChange={(e) => setAssignToMe(e.target.checked)} className="rounded" />
        Assign the case to me
      </label>

      <Button className="w-full rounded-xl" disabled={busy || (!note.trim() && !assignToMe)} onClick={submit}>
        {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-1.5" />}
        Save to case
      </Button>
    </div>
  );
}