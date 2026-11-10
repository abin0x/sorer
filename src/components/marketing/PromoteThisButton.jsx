import React, { useEffect, useState } from "react";
import { format, isBefore, startOfDay, addDays, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Megaphone, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { PLATFORMS, CAMPAIGN_PLATFORMS } from "@/lib/marketing/constants";

const DEFAULT_STEPS = [
  { offset: -21, role: "teaser", label: "Announce" },
  { offset: -7, role: "reminder", label: "Reminder" },
  { offset: -2, role: "reminder", label: "Last call" },
  { offset: 0, role: "day_of", label: "Day-of" },
  { offset: 1, role: "recap", label: "Recap" },
];

const ROLES = [
  { value: "teaser", label: "Announce / teaser" },
  { value: "reminder", label: "Reminder" },
  { value: "day_of", label: "Day-of" },
  { value: "live", label: "Live" },
  { value: "recap", label: "Recap" },
  { value: "thank_you", label: "Thank you" },
];

function stepDate(eventDate, offset) {
  return addDays(parseISO(eventDate), offset).toISOString();
}

export default function PromoteThisButton({ event, clubId, variant = "default", size, className = "" }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [platforms, setPlatforms] = useState(CAMPAIGN_PLATFORMS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSteps(DEFAULT_STEPS);
  }, [open]);

  if (!event || !event.date || !clubId) return null;

  const today = startOfDay(new Date());
  const visibleSteps = steps
    .map((s) => ({ ...s, date: stepDate(event.date, s.offset) }))
    .filter((s) => !isBefore(new Date(s.date), today));
  const total = visibleSteps.length * platforms.length;

  const updateStep = (i, patch) => setSteps((c) => c.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStep = () => setSteps((c) => [...c, { offset: -3, role: "reminder", label: "New step" }]);
  const removeStep = (i) => setSteps((c) => c.filter((_, idx) => idx !== i));

  const togglePlatform = (p) =>
    setPlatforms((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));

  const generate = async () => {
    if (!visibleSteps.length || !platforms.length) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke("generate-campaign-content", {
        club_id: clubId,
        event,
        steps: visibleSteps.map((s) => ({ offset: s.offset, role: s.role, label: s.label, date: s.date })),
        platforms,
        campaign_name: `${event.title} promo`,
      });
      const data = res?.data || res;
      toast({
        title: "Campaign created",
        description: `${data.post_count} AI-generated drafts added to your marketing calendar${data.task_count ? ` · ${data.task_count} review task${data.task_count > 1 ? "s" : ""} with due dates` : ""}.`,
      });
      qc.invalidateQueries({ queryKey: ["mkt-posts"] });
      qc.invalidateQueries({ queryKey: ["mkt-campaigns"] });
      setOpen(false);
    } catch (e) {
      toast({ title: "Generation failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <Megaphone className="w-4 h-4 mr-1.5" /> Promote this
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Promote {event.title}
            </DialogTitle>
            <DialogDescription>
              {format(parseISO(event.date), "MMM d, yyyy")}. AI generates a draft per channel for each
              step — announce 3 weeks before, reminders, day-of, and recap.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label className="text-xs font-semibold">Channels</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {CAMPAIGN_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium ${
                    platforms.includes(p) ? PLATFORMS[p].chip : "text-muted-foreground"
                  }`}
                >
                  {PLATFORMS[p].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Timeline</Label>
              <Button size="sm" variant="ghost" onClick={addStep} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add step
              </Button>
            </div>
            <div className="space-y-2 mt-1.5">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                  <Input
                    type="number"
                    value={s.offset}
                    onChange={(e) => updateStep(i, { offset: Number(e.target.value) })}
                    className="w-16 h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                  <Select value={s.role} onValueChange={(v) => updateStep(i, { role: v })}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={s.label}
                    onChange={(e) => updateStep(i, { label: e.target.value })}
                    className="flex-1 h-8 text-xs"
                    placeholder="Label"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => removeStep(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {visibleSteps.length < steps.length && (
              <p className="text-xs text-muted-foreground mt-2">
                {steps.length - visibleSteps.length} step(s) skipped — already in the past.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">{total} draft posts will be generated</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each starts as a Draft. Review, then move to In review → Approved → Scheduled.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={busy || !total}>
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              Generate {total} drafts
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}