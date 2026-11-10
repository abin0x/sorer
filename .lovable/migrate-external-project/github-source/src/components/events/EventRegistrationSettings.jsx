import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EventRegistrationSettings({ value, onChange }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  return (
    <div className="space-y-3 border-t pt-4">
      <Label className="font-semibold">Registration & Pricing</Label>
      <div><Label>Event Category</Label>
        <Select value={value.type} onValueChange={(v) => set("type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["camp", "class", "clinic", "tournament", "open_play", "social"].map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Capacity (0 = unlimited)</Label><Input type="number" min="0" value={value.capacity} onChange={(e) => set("capacity", Number(e.target.value))} /></div>
        <div><Label>Price for entire event</Label><Input type="number" min="0" step="0.01" value={value.price} onChange={(e) => set("price", Number(e.target.value))} /></div>
        <div><Label>Registration Opens</Label><Input type="date" value={value.registration_opens} onChange={(e) => set("registration_opens", e.target.value)} /></div>
        <div><Label>Registration Closes</Label><Input type="date" value={value.registration_closes} onChange={(e) => set("registration_closes", e.target.value)} /></div>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={value.is_public} onCheckedChange={(v) => set("is_public", !!v)} />Public signup</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={value.allow_waitlist} onCheckedChange={(v) => set("allow_waitlist", !!v)} />Allow waitlist</label>
      </div>
    </div>
  );
}