import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_TYPES, PLATFORMS, TONES } from "@/lib/marketing/constants";
import HashtagEditor from "./HashtagEditor";

const EMPTY = { name: "", event_type: "custom", platform: "any", tone: "friendly", body_template: "", hashtags: [], image_prompt_template: "" };

export default function TemplateDialog({ open, onOpenChange, template, onSave }) {
  const [form, setForm] = useState(EMPTY);
  useEffect(() => { if (open) setForm({ ...EMPTY, ...(template || {}) }); }, [open, template]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const sel = (k, children) => (
    <Select value={form[k]} onValueChange={set(k)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{children}</SelectContent></Select>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{template?.id ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => set("name")(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">Event type</Label>{sel("event_type", Object.entries(EVENT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>))}</div>
            <div><Label className="text-xs">Platform</Label>{sel("platform", [<SelectItem key="any" value="any">Any</SelectItem>, ...Object.entries(PLATFORMS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)])}</div>
            <div><Label className="text-xs">Tone</Label>{sel("tone", TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</div>
          </div>
          <div>
            <Label className="text-xs">Post text</Label>
            <Textarea rows={5} value={form.body_template} onChange={(e) => set("body_template")(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">Merge tags: {"{club_name} {event_name} {team_name} {age_group} {date} {time} {location} {link}"}</p>
          </div>
          <div><Label className="text-xs">Default hashtags</Label><HashtagEditor value={form.hashtags} onChange={set("hashtags")} /></div>
          <div><Label className="text-xs">AI image prompt</Label><Input value={form.image_prompt_template} onChange={(e) => set("image_prompt_template")(e.target.value)} /></div>
          <Button className="w-full" disabled={!form.name || !form.body_template} onClick={() => onSave(form)}>Save template</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}