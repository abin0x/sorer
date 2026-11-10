import React, { useState, useEffect, useMemo } from "react";
import { callImport } from "@/lib/migrationImport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MappingRow from "./MappingRow";

const ENTITIES = [
  { value: "Player", label: "Players" },
  { value: "Guardian", label: "Guardians" },
  { value: "Team", label: "Teams" },
];

export default function MappingReview({ file, mappings, targets, onBack, onRefresh }) {
  const { toast } = useToast();
  const [rows, setRows] = useState(mappings);
  const [dirty, setDirty] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [entityChanging, setEntityChanging] = useState(false);

  useEffect(() => {
    setRows(mappings);
    setDirty(new Set());
    setError("");
  }, [mappings]);

  const entity = file.selected_entity;
  const fields = targets?.[entity] || [];

  const update = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((prev) => new Set(prev).add(id));
  };

  // Duplicate target detection within each group.
  const duplicates = useMemo(() => {
    const seen = {};
    const dups = new Set();
    for (const r of rows) {
      if (!r.target_field || ["ignored", "kept", "unmapped"].includes(r.status)) continue;
      const key = `${r.group}|${r.target_field}`;
      if (seen[key]) { dups.add(r.id); dups.add(seen[key]); }
      else seen[key] = r.id;
    }
    return dups;
  }, [rows]);

  const buildUpdates = () =>
    [...dirty].map((id) => {
      const r = rows.find((x) => x.id === id);
      return { id, target_field: r.target_field, status: r.status, value_map: r.value_map || {} };
    });

  const save = async (confirm = false) => {
    if (duplicates.size > 0) {
      setError("Resolve duplicate field mappings before saving.");
      return;
    }
    setError("");
    const setter = confirm ? setConfirming : setSaving;
    setter(true);
    try {
      const res = await callImport({
        action: "save_mapping",
        file_id: file.id,
        confirm,
        updates: buildUpdates(),
      });
      setDirty(new Set());
      if (confirm) {
        toast({ title: "Mapping confirmed", description: "This file is ready for specialist review." });
        onRefresh();
        onBack();
      } else {
        if (res.warnings?.length) toast({ title: "Saved with notes", description: res.warnings.join(" "), variant: "default" });
        else toast({ title: "Mapping saved" });
        onRefresh();
      }
    } catch (e) {
      const msg = e?.message || "Save failed";
      setError(msg);
      if (confirm) toast({ title: "Cannot confirm", description: msg, variant: "destructive" });
    } finally {
      setter(false);
    }
  };

  const changeEntity = async (newEntity) => {
    if (newEntity === entity) return;
    setEntityChanging(true);
    try {
      await callImport({ action: "set_entity", file_id: file.id, entity: newEntity });
      onRefresh();
    } catch (e) {
      toast({ title: "Couldn't change entity", description: e?.message, variant: "destructive" });
    } finally {
      setEntityChanging(false);
    }
  };

  // Group rows: main (0), then guardian groups sorted by number.
  const groups = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const g = r.group || 0;
      (map[g] = map[g] || []).push(r);
    }
    return Object.keys(map).map(Number).sort((a, b) => a - b).map((g) => ({
      key: g,
      label: g === 0 ? "Main record" : `Guardian ${g}`,
      rows: map[g].sort((a, b) => a.source_index - b.source_index),
    }));
  }, [rows]);

  const undecidedCount = rows.filter((r) => !r.target_field && r.status === "unmapped").length;
  const scores = file.detection_scores || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4" /> Back to files</Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">This file contains:</span>
          <Select value={entity} onValueChange={changeEntity} disabled={entityChanging}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{ENTITIES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Card><CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span><strong className="text-slate-700">{file.original_name}</strong></span>
          <span>{file.row_count} rows · {file.column_count} columns · {file.encoding} · delimiter "{file.delimiter}"</span>
          <span>Detection: {ENTITIES.map((e) => `${e.label} ${Math.round((scores[e.value] || 0) * 100)}%`).join(" · ")}</span>
        </div>
      </CardContent></Card>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.key}>
            {g.label !== "Main record" && <h3 className="text-sm font-semibold text-indigo-600 mb-2">{g.label}</h3>}
            <div className="space-y-2">
              {g.rows.map((r) => {
                const fieldDef = fields.find((f) => f.name === r.target_field);
                return (
                  <MappingRow
                    key={r.id}
                    row={r}
                    target={{ fields, type: fieldDef?.type, options: fieldDef?.options }}
                    duplicate={duplicates.has(r.id)}
                    onChange={update}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between sticky bottom-2 bg-background/90 backdrop-blur border rounded-lg p-3">
        <p className="text-sm text-slate-500">
          {undecidedCount > 0 ? `${undecidedCount} column(s) need a decision` : "All columns resolved"}
          {dirty.size > 0 && ` · ${dirty.size} unsaved change(s)`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(false)} disabled={saving || dirty.size === 0 || confirming}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
          </Button>
          <Button onClick={() => save(true)} disabled={confirming || dirty.size > 0 || duplicates.size > 0}>
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirm mapping
          </Button>
        </div>
      </div>
    </div>
  );
}