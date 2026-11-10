import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Pencil, Trash2, CalendarClock, ClipboardList } from "lucide-react";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-muted text-muted-foreground",
};

export default function PlansTab({ clubId, canEdit }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons", clubId],
    enabled: !!clubId,
    queryFn: async () => (await base44.entities.Season.filter({ club_id: clubId }, { sort: "-created_date", limit: 50 })).items,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["mkt-plans", clubId],
    enabled: !!clubId,
    queryFn: async () => (await base44.entities.MarketingPlan.filter({ club_id: clubId }, { sort: "-created_date", limit: 50 })).items,
  });

  const { data: kits = [] } = useQuery({
    queryKey: ["mkt-brandkits", clubId],
    enabled: !!clubId,
    queryFn: async () => (await base44.entities.BrandKit.filter({ club_id: clubId }, { limit: 50 })).items,
  });

  const startNew = () => setEditing({ name: "", season_id: "", goals: "", brand_kit_id: "", budget: 0, status: "draft", notes: "" });
  const startEdit = (p) => setEditing({ ...p });

  const save = async () => {
    if (!editing.name || !editing.season_id) { toast({ title: "Name and season are required", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const season = seasons.find((s) => s.id === editing.season_id);
      const payload = { ...editing, season_name: season?.name || "", budget: Number(editing.budget) || 0 };
      if (editing.id) await base44.entities.MarketingPlan.update(editing.id, payload);
      else await base44.entities.MarketingPlan.create({ ...payload, club_id: clubId });
      qc.invalidateQueries({ queryKey: ["mkt-plans"] });
      toast({ title: "Marketing plan saved" });
      setEditing(null);
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete plan "${p.name}"?`)) return;
    await base44.entities.MarketingPlan.delete(p.id);
    qc.invalidateQueries({ queryKey: ["mkt-plans"] });
    toast({ title: "Plan deleted" });
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (editing) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{editing.id ? "Edit marketing plan" : "New marketing plan"}</h3>
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
        </div>
        <Card><CardContent className="p-5 space-y-4">
          <div><Label className="text-xs">Plan name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="2026-2027 season marketing" /></div>
          <div>
            <Label className="text-xs">Season</Label>
            <Select value={editing.season_id} onValueChange={(v) => setEditing({ ...editing, season_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
              <SelectContent>{seasons.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            {seasons.length === 0 && <p className="text-xs text-muted-foreground mt-1">No seasons found. Create a season first in the Seasons page.</p>}
          </div>
          <div>
            <Label className="text-xs">Brand kit</Label>
            <Select value={editing.brand_kit_id || "none"} onValueChange={(v) => setEditing({ ...editing, brand_kit_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Default brand kit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Club default</SelectItem>
                {kits.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Goals</Label><Textarea rows={3} value={editing.goals} onChange={(e) => setEditing({ ...editing, goals: e.target.value })} placeholder="Drive tryout registrations, grow social following..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Budget</Label><Input type="number" value={editing.budget} onChange={(e) => setEditing({ ...editing, budget: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save plan</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">One marketing plan per season — goals, budget, and the brand kit for AI-generated content.</p>
        {canEdit && <Button size="sm" onClick={startNew} disabled={seasons.length === 0}><Plus className="w-4 h-4 mr-1" /> New plan</Button>}
      </div>
      {plans.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">
            {seasons.length === 0 ? "Create a season first, then add a marketing plan for it." : "No marketing plans yet. Create one to organize your season's promotion."}
          </p>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className="adisal-card"><CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" />
                  <div><p className="font-semibold text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{p.season_name}</p></div>
                </div>
                <Badge className={`text-[10px] ${STATUS_STYLES[p.status] || ""}`}>{p.status}</Badge>
              </div>
              {p.goals && <p className="text-xs text-muted-foreground line-clamp-2">{p.goals}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {p.budget > 0 && <span>Budget: ${p.budget.toLocaleString()}</span>}
                {p.brand_kit_id && <span>Brand kit linked</span>}
              </div>
              {canEdit && <div className="flex gap-1 pt-1">
                <Button size="sm" variant="ghost" onClick={() => startEdit(p)}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => remove(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}