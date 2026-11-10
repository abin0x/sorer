import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MUTE_DURATIONS, computeMuteExpiry } from "@/lib/quietHours";

export default function MuteDialog({ open, onOpenChange, channel, onSave }) {
  const [scope, setScope] = useState("channel");
  const [level, setLevel] = useState("muted");
  const [duration, setDuration] = useState("8h");

  const handleSave = () => {
    onSave({
      scope,
      target_id: scope === "team" ? channel.team_id : channel.id,
      target_name: scope === "team" ? channel.team_name : channel.name,
      level,
      expires_at: computeMuteExpiry(duration),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Mute notifications</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {channel?.team_id && (
            <div>
              <Label className="text-xs text-muted-foreground">Mute</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="channel">Just this channel</SelectItem>
                  <SelectItem value="team">This whole team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="muted">Mute everything</SelectItem>
                <SelectItem value="mentions">Mentions & replies only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MUTE_DURATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">Priority messages still come through, even while muted.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">Mute</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}