import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { fetchMembers } from "@/lib/journey/useJourney";

/** Skip or defer: always shows what the club gives up before confirming. */
export function SkipDialog({ target, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  useEffect(() => { setNote(""); }, [target]);
  if (!target) return null;
  const { step, mode } = target;
  const verb = mode === "deferred" ? "Defer" : "Skip";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{verb} "{step.title}"?</DialogTitle>
          <DialogDescription>You can come back to this step at any time.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{step.skipNote || "Anything this step sets up will stay unfinished until you complete it."}</span>
        </div>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for your team" rows={2} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(step, mode, note)}>{verb} step</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignDialog({ target, onClose, onConfirm }) {
  const [email, setEmail] = useState("");
  const { data: members = [] } = useQuery({ queryKey: ["journeyMembers"], queryFn: fetchMembers, enabled: !!target });
  useEffect(() => { setEmail(target?.assignee_email || "none"); }, [target]);
  if (!target) return null;
  const chosen = members.find((m) => m.email === email);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign "{target.step.title}"</DialogTitle>
          <DialogDescription>The person will be able to update this step.</DialogDescription>
        </DialogHeader>
        <Select value={email} onValueChange={setEmail}>
          <SelectTrigger><SelectValue placeholder="Choose a person" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.email} value={m.email}>{m.name}{m.pending ? " (invited)" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(target.step, email === "none" ? "" : email, chosen?.name || "")}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}