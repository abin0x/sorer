import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callImport } from "@/lib/migrationImport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, FolderOpen, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const SOURCES = [
  { value: "teamsnap", label: "TeamSnap" },
  { value: "sportsengine", label: "SportsEngine" },
  { value: "sprocket", label: "Sprocket" },
  { value: "leagueapps", label: "LeagueApps" },
  { value: "playmetrics", label: "PlayMetrics" },
  { value: "spreadsheet_other", label: "Spreadsheet / Other" },
];

export default function ImportProjectsPanel({ clubId, onOpenProject }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState("spreadsheet_other");
  const [season, setSeason] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: { projects } = {}, isLoading } = useQuery({
    queryKey: ["migrationProjects", clubId],
    queryFn: () => callImport({ action: "list_projects", club_id: clubId }),
    enabled: !!clubId,
  });

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { project } = await callImport({
        action: "create_project",
        club_id: clubId,
        name: name.trim(),
        source_system: source,
        season: season.trim(),
      });
      qc.invalidateQueries({ queryKey: ["migrationProjects", clubId] });
      setName("");
        setSeason("");
      setShowForm(false);
      onOpenProject(project.id);
    } catch (e) {
      toast({ title: "Couldn't create project", description: e?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Upload exports from your previous system and review the column mapping before anything goes live.</p>
        <Button onClick={() => setShowForm((s) => !s)}><Plus className="w-4 h-4" /> New project</Button>
      </div>

      {showForm && (
        <Card><CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Project name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026 Roster Import" />
            </div>
            <div className="space-y-1.5">
              <Label>Source system</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Season</Label>
              <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026-2027" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={create} disabled={creating || !name.trim()}>{creating && <Loader2 className="w-4 h-4 animate-spin" />} Create</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : projects?.length ? (
        <div className="space-y-2">
          {projects.map((p) => (
            <button key={p.id} onClick={() => onOpenProject(p.id)} className="w-full text-left">
              <Card className="hover:border-primary/40 transition-colors"><CardContent className="p-4 flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.source_system} · {p.season || "no season"} · {p.status}</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-400 rotate-180" />
              </CardContent></Card>
            </button>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-8 text-center text-sm text-slate-500">No import projects yet. Create one to get started.</CardContent></Card>
      )}
    </div>
  );
}