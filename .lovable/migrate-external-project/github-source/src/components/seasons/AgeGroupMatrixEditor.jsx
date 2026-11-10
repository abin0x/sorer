import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { generateAgeGroupMatrix } from "@/lib/tryoutDefaults";

const FORMATS = ["4v4", "7v7", "9v9", "11v11"];

export default function AgeGroupMatrixEditor({ season }) {
  const queryClient = useQueryClient();
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [u7StartDate, setU7StartDate] = useState("");
  const [count, setCount] = useState(13);
  const [generating, setGenerating] = useState(false);

  const { data: ageGroups = [], isLoading } = useQuery({
    queryKey: ["ageGroups", season?.id],
    queryFn: () => base44.entities.AgeGroup.filter({ season_id: season.id }, "order"),
    enabled: !!season,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ageGroups", season.id] });

  const updateRow = async (row, field, value) => {
    await base44.entities.AgeGroup.update(row.id, { [field]: value });
    invalidate();
  };

  const addRow = async () => {
    await base44.entities.AgeGroup.create({
      season_id: season.id,
      season_name: season.name,
      age_group: "New Age Group",
      birth_date_start: "",
      birth_date_end: "",
      playing_format: "7v7",
      order: ageGroups.length,
    });
    invalidate();
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`Remove ${row.age_group} from the matrix?`)) return;
    await base44.entities.AgeGroup.delete(row.id);
    invalidate();
    toast.success("Age group removed");
  };

  const handleAutoGenerate = async () => {
    if (!u7StartDate) return;
    if (ageGroups.length > 0 && !window.confirm(`This replaces the ${ageGroups.length} existing age group(s) for ${season.name}. Continue?`)) return;
    setGenerating(true);
    try {
      await base44.entities.AgeGroup.deleteMany({ season_id: season.id });
      const rows = generateAgeGroupMatrix(u7StartDate, Number(count) || 13);
      await base44.entities.AgeGroup.bulkCreate(
        rows.map((r) => ({ ...r, season_id: season.id, season_name: season.name }))
      );
      toast.success(`Generated ${rows.length} age groups from U7 = ${u7StartDate}`);
      setShowAutoGen(false);
      invalidate();
    } catch (e) {
      toast.error("Auto-generate failed. Please try again.");
    }
    setGenerating(false);
  };

  if (!season) {
    return <p className="text-sm text-muted-foreground">Select a season to configure its age group matrix.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-foreground">Age Group Matrix — {season.name}</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAutoGen((v) => !v)} className="gap-1.5">
            <Wand2 className="w-3.5 h-3.5" /> Auto-Generate
          </Button>
          <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Age Group
          </Button>
        </div>
      </div>

      {showAutoGen && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Enter the U7 age group's birth-date range start. Every older age group is calculated automatically,
            shifting the whole range back one year per group (U8 = one year older than U7, and so on).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>U7 birth date start</Label>
              <Input type="date" value={u7StartDate} onChange={(e) => setU7StartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Number of age groups</Label>
              <Input type="number" min="1" max="20" value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={handleAutoGenerate} disabled={generating || !u7StartDate}>
            {generating ? "Generating…" : "Generate Matrix"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : ageGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">
          No age groups configured for this season yet.
        </p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Age Group</span>
            <span>Birth Date Start</span>
            <span>Birth Date End</span>
            <span>Format</span>
            <span></span>
          </div>
          {ageGroups.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 items-center border-t border-border">
              <Input
                defaultValue={row.age_group}
                onBlur={(e) => e.target.value !== row.age_group && updateRow(row, "age_group", e.target.value)}
                className="h-9"
              />
              <Input
                type="date"
                defaultValue={row.birth_date_start}
                onBlur={(e) => e.target.value !== row.birth_date_start && updateRow(row, "birth_date_start", e.target.value)}
                className="h-9"
              />
              <Input
                type="date"
                defaultValue={row.birth_date_end}
                onBlur={(e) => e.target.value !== row.birth_date_end && updateRow(row, "birth_date_end", e.target.value)}
                className="h-9"
              />
              <Select value={row.playing_format} onValueChange={(v) => updateRow(row, "playing_format", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" onClick={() => deleteRow(row)} className="text-destructive hover:text-destructive h-9 w-9">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}