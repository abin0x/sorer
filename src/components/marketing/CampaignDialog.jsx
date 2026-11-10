import React, { useEffect, useState } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import { PLATFORMS, COMPOSER_PLATFORMS, ROLE_LEADS, SYSTEM_TEMPLATES, addUtm, buildCadence, buildVars, fillTemplate, getBestTemplate, stepDate } from "@/lib/marketing/constants";
import { useMarketingData } from "@/lib/marketing/useMarketingData";

const PRESETS = [{ value: "light", label: "Light" }, { value: "standard", label: "Standard" }, { value: "aggressive", label: "Aggressive" }];

export default function CampaignDialog({ open, onOpenChange, event, clubId }) {
  const { brand } = useTenant();
  const { connectedPlatforms, templates } = useMarketingData(clubId);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [preset, setPreset] = useState("standard");
  const [platforms, setPlatforms] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const c = connectedPlatforms.filter((p) => COMPOSER_PLATFORMS.includes(p));
    setPlatforms(c.length ? c : ["facebook"]);
  }, [open]);

  if (!event) return null;
  const today = startOfDay(new Date());
  const steps = buildCadence(event.marketing_type, preset).map((s) => ({ ...s, date: stepDate(event.date, s.offset) })).filter((s) => !isBefore(s.date, today));
  const total = steps.length * platforms.length;

  const create = async () => {
    if (!steps.length || !platforms.length) return;
    setBusy(true);
    const campaign = await base44.entities.Campaign.create({
      club_id: clubId, name: `${event.title} promo`, source_type: event.source_type, source_id: event.source_id, event_type: event.marketing_type,
      type: "event_promo", start_date: format(steps[0].date, "yyyy-MM-dd"), end_date: format(steps[steps.length - 1].date, "yyyy-MM-dd"), status: "active", cadence_preset: preset,
    });
    const all = [...templates, ...SYSTEM_TEMPLATES];
    const rows = steps.flatMap((s, i) => platforms.map((p) => {
      const tpl = getBestTemplate(all, { eventType: event.marketing_type, platform: p, role: s.role });
      const vars = buildVars({ ...event, url: event.url ? addUtm(event.url, p, campaign.name) : "" }, brand.club_name);
      return {
        club_id: clubId, campaign_id: campaign.id, campaign_role: s.role, sequence_order: i + 1, offset_days: s.offset, platform: p, status: "draft",
        title: `${event.title} · ${s.label}`, event_title: event.title, event_type: event.marketing_type, source_type: event.source_type, source_id: event.source_id,
        body: `${ROLE_LEADS[s.role]} ${fillTemplate(tpl.body_template, vars)}`, hashtags: tpl.hashtags || [], tone: tpl.tone, scheduled_for: s.date.toISOString(),
      };
    }));
    await base44.entities.Post.bulkCreate(rows);
    qc.invalidateQueries({ queryKey: ["mkt-posts"] });
    qc.invalidateQueries({ queryKey: ["mkt-campaigns"] });
    toast({ title: "Campaign created", description: `${rows.length} draft posts added to your marketing calendar.` });
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a promo campaign?</DialogTitle>
          <DialogDescription>{event.title} · {format(new Date(`${event.date}T00:00`), "MMM d, yyyy")}. Posts start as drafts so you can review each one.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          {PRESETS.map((p) => <Button key={p.value} size="sm" variant={preset === p.value ? "default" : "outline"} onClick={() => setPreset(p.value)}>{p.label}</Button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {COMPOSER_PLATFORMS.map((p) => (
            <button key={p} type="button" onClick={() => setPlatforms((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]))}
              className={`px-3 py-1 rounded-full border text-xs font-medium ${platforms.includes(p) ? PLATFORMS[p].chip : "text-muted-foreground"}`}>{PLATFORMS[p].label}</button>
          ))}
        </div>
        <div className="space-y-1 text-sm">
          {steps.map((s) => <div key={`${s.offset}-${s.label}`} className="flex justify-between border-b py-1"><span>{s.label}</span><span className="text-muted-foreground">{format(s.date, "MMM d")} · T{s.offset > 0 ? "+" : ""}{s.offset}</span></div>)}
          {steps.length === 0 && <p className="text-muted-foreground">All steps for this event are in the past.</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Skip</Button>
          <Button onClick={create} disabled={busy || !total}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Create {total} drafts</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}