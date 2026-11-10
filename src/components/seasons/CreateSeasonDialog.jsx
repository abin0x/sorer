import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateSeasonDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name) return;
    setSaving(true);
    await base44.entities.Season.create({
      name,
      start_date: startDate,
      end_date: endDate,
      status: "draft",
    });
    setSaving(false);
    setName("");
    setStartDate("");
    setEndDate("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Season</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Season name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2027-2028" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !name}>
            {saving ? "Creating…" : "Create Season"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}