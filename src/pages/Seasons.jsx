import React, { useState } from "react";
import { Link } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/lib/TenantContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, Plus, RotateCcw, Star } from "lucide-react";
import CreateSeasonDialog from "@/components/seasons/CreateSeasonDialog";
import PrepareSeasonDialog from "@/components/seasons/PrepareSeasonDialog";
import AgeGroupMatrixEditor from "@/components/seasons/AgeGroupMatrixEditor";
import RolloverReview from "@/components/seasons/RolloverReview";
import SeasonMatrix from "@/components/seasons/SeasonMatrix";
import SeasonSwitchPanel from "@/components/seasons/SeasonSwitchPanel";
import SeasonSelector from "@/components/seasons/SeasonSelector";
import { useSelectedSeason } from "@/lib/useSelectedSeason";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-700",
  preparing: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  closing: "bg-blue-100 text-blue-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-slate-100 text-slate-500",
};

export default function Seasons() {
  const qc = useQueryClient();
  const { effectiveClubId: clubId } = useTenant();
  const [showCreate, setShowCreate] = useState(false);
  const [prepareFrom, setPrepareFrom] = useState(null);
  const { selected, setSelectedSeason } = useSelectedSeason();

  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ["seasons"],
    queryFn: () => base44.entities.Season.list("-created_date"),
  });
  const refresh = () => qc.invalidateQueries();

  const preparing = seasons.find((s) => s.status === "preparing");
  const current = seasons.find((s) => s.is_current);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><CalendarClock className="w-6 h-6 text-primary" /> Seasons</h1>
          <p className="text-sm text-muted-foreground mt-1">Prepare the next season while the current one stays live, then switch when everything is ready.</p>
        </div>
        <div className="flex items-center gap-2">
          <SeasonSelector seasons={seasons} value={selected?.id} onChange={setSelectedSeason} />
          <Button onClick={() => setShowCreate(true)} variant="outline" className="gap-1.5"><Plus className="w-4 h-4" /> New Season</Button>
        </div>
      </div>

      {!isLoading && seasons.length === 0 && (
        <div className="text-center py-12 text-sm border border-dashed border-border rounded-xl space-y-3">
          <p className="text-muted-foreground">No season data yet. New clubs start with the Migration Wizard, which creates Season 1 as Current.</p>
          <Button asChild><Link to="/MigrationWizard">Open Migration Wizard</Link></Button>
        </div>
      )}

      {current && !preparing && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-medium">{current.name} is live. Ready to plan the next one?</p>
          <Button onClick={() => setPrepareFrom(current)} className="gap-1.5"><RotateCcw className="w-4 h-4" /> Prepare next season</Button>
        </div>
      )}
      {preparing && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">{preparing.name} is in Preparing. Resume below: review rollover, confirm the matrix, then switch.</p>}

      {seasons.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {seasons.map((s) => (
            <button key={s.id} onClick={() => setSelectedSeason(s.id)}
              className={`text-left border rounded-xl p-4 space-y-1 transition-colors ${selected?.id === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold flex items-center gap-1.5">{s.is_current && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}{s.name}</p>
                <Badge className={`text-xs ${STATUS_STYLES[s.status] || STATUS_STYLES.draft}`}>{s.status}</Badge>
              </div>
              {(s.start_date || s.end_date) && <p className="text-xs text-muted-foreground">{s.start_date || "—"} → {s.end_date || "—"}</p>}
            </button>
          ))}
        </div>
      )}

      {selected?.status === "preparing" ? (
        <Tabs defaultValue="rollover" className="border-t border-border pt-6">
          <TabsList>
            <TabsTrigger value="rollover">1 · Rollover review</TabsTrigger>
            <TabsTrigger value="agegroups">2 · Age group matrix</TabsTrigger>
            <TabsTrigger value="matrix">3 · Team matrix</TabsTrigger>
            <TabsTrigger value="switch">10 · Season switch</TabsTrigger>
          </TabsList>
          <TabsContent value="rollover" className="pt-4"><RolloverReview season={selected} clubId={clubId} /></TabsContent>
          <TabsContent value="agegroups" className="pt-4"><AgeGroupMatrixEditor season={selected} clubId={clubId} /></TabsContent>
          <TabsContent value="matrix" className="pt-4"><SeasonMatrix season={selected} clubId={clubId} onConfirmed={refresh} /></TabsContent>
          <TabsContent value="switch" className="pt-4"><SeasonSwitchPanel season={selected} current={current} clubId={clubId} onChanged={refresh} /></TabsContent>
        </Tabs>
      ) : selected && (
        <div className="border-t border-border pt-6"><AgeGroupMatrixEditor season={selected} clubId={clubId} /></div>
      )}

      <CreateSeasonDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refresh(); }} />
      <PrepareSeasonDialog source={prepareFrom} clubId={clubId} onClose={() => setPrepareFrom(null)} onDone={() => { setPrepareFrom(null); refresh(); }} />
    </div>
  );
}