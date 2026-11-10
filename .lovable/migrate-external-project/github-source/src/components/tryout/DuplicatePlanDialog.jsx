import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy } from "lucide-react";
import { currentSeason, nextSeason } from "@/lib/tryoutDefaults";
import {
  duplicatePlanPayload,
  duplicateSessionPayloads,
  tryoutSignupUrl,
} from "@/lib/tryoutSessions";
import { toast } from "sonner";

/**
 * Duplicates a previous season's tryout event onto a new season: teams,
 * branches, platforms, age group, fee, capacity, required documents and the
 * session run (times, fields, capacity, evaluators) all carry over, with the
 * session dates shifted onto the new window. Everything lands as a draft.
 */
export default function DuplicatePlanDialog({ open, plans = [], onClose, onDuplicated }) {
  const [sourceId, setSourceId] = useState("");
  const [season, setSeason] = useState(currentSeason());
  const [startDate, setStartDate] = useState("");
  const [title, setTitle] = useState("");
  const [copySessions, setCopySessions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons-for-duplicate"],
    queryFn: () => base44.entities.Season.list("-created_date", 50).catch(() => []),
    enabled: !!open,
  });

  const seasonOptions = Array.from(
    new Set([currentSeason(), nextSeason(), ...seasons.map((s) => s.name).filter(Boolean)])
  );

  const source = plans.find((p) => p.id === sourceId);

  useEffect(() => {
    if (!open || !source) return;
    setTitle(source.season ? source.title.replace(source.season, season) : `${source.title} (copy)`);
    setStartDate(source.start_date ? `${Number(source.start_date.slice(0, 4)) + 1}${source.start_date.slice(4)}` : "");
    setError("");
  }, [sourceId, season, open]);

  const handleSubmit = async () => {
    if (!source) return;
    if (!title) {
      setError("Give the new tryout event a name.");
      return;
    }
    if (copySessions && !startDate) {
      setError("Choose when the new tryout window starts, so the sessions can be moved onto it.");
      return;
    }
    setSaving(true);

    const newPlan = await base44.entities.TryoutPlan.create(duplicatePlanPayload(source, { title, season, startDate }));

    if (copySessions) {
      const sourceSessions = await base44.entities.TryoutEvent.filter({ tryout_plan_id: source.id }, "date");
      if (sourceSessions.length) {
        const baseDate = source.start_date || sourceSessions[0].date;
        const payloads = duplicateSessionPayloads(sourceSessions, newPlan, baseDate).filter((p) => p.date);
        if (payloads.length) {
          const created = await base44.entities.TryoutEvent.bulkCreate(payloads);
          const withLinks = created
            .filter((e) => e.auto_registration)
            .map((e) => ({ id: e.id, registration_url: tryoutSignupUrl(e.id) }));
          if (withLinks.length) await base44.entities.TryoutEvent.bulkUpdate(withLinks);
        }
      }
    }

    setSaving(false);
    toast.success(`Duplicated as a draft for ${season}`);
    onDuplicated(newPlan.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-4 h-4" /> Duplicate a previous tryout event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Copy from</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger><SelectValue placeholder="Select a previous tryout event" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}{p.season ? ` · ${p.season}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {plans.length === 0 && (
              <p className="text-xs text-muted-foreground">No existing tryout events to copy from.</p>
            )}
          </div>

          {source && (
            <>
              <div className="space-y-1.5">
                <Label>New event name</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Season</Label>
                  <Select value={season} onValueChange={setSeason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {seasonOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tryout window starts</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Carry over the sessions</p>
                  <p className="text-xs text-muted-foreground">
                    Same times, fields, capacity and evaluators, with dates moved onto the new window
                  </p>
                </div>
                <Switch checked={copySessions} onCheckedChange={setCopySessions} />
              </div>

              <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg px-3 py-2 space-y-1">
                <p>Carried over: {[source.age_group, source.gender, source.format].filter(Boolean).join(" ") || "age group"} · {source.team_names?.length || 0} teams · {source.location_names?.join(", ") || "no branch"}</p>
                {(source.tryout_fee || source.max_capacity) && (
                  <p>
                    {source.tryout_fee ? `Fee ${source.tryout_fee}` : "No fee"}
                    {source.max_capacity ? ` · capacity ${source.max_capacity}` : ""}
                    {source.required_documents?.length ? ` · ${source.required_documents.length} required documents` : ""}
                  </p>
                )}
                <p>The new event starts as a draft — registration dates and signup links are created fresh.</p>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !source || !title}>
            {saving ? "Duplicating…" : "Duplicate event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}