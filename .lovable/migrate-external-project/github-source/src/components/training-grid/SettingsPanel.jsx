import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, RotateCcw, Plus, X, GripVertical } from "lucide-react";
import { DEFAULT_SETTINGS } from "@/lib/trainingGridParser";

export default function SettingsPanel({ settings, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);

  const sync = (next) => {
    setDraft(next);
    onChange(next);
  };

  const updateField = (idx, val) => {
    const next = [...draft.fields];
    next[idx] = val;
    sync({ ...draft, fields: next });
  };

  const addField = () => sync({ ...draft, fields: [...draft.fields, ""] });
  const removeField = (idx) => sync({ ...draft, fields: draft.fields.filter((_, i) => i !== idx) });
  const moveField = (idx, dir) => {
    const next = [...draft.fields];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    sync({ ...draft, fields: next });
  };

  const updateDay = (sheet, abbr) => {
    const next = { ...draft.days };
    if (abbr.trim()) next[sheet] = abbr.trim();
    else delete next[sheet];
    sync({ ...draft, days: next });
  };
  const addDay = () => {
    const name = `Sheet${Object.keys(draft.days).length + 1}`;
    sync({ ...draft, days: { ...draft.days, [name]: "Day" } });
  };
  const removeDay = (sheet) => sync({ ...draft, days: Object.fromEntries(Object.entries(draft.days).filter(([k]) => k !== sheet)) });

  const reset = () => sync({ ...DEFAULT_SETTINGS });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" /> Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Parser Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Fields to extract */}
          <div className="space-y-2">
            <Label className="font-semibold">Fields to Extract (order = output order)</Label>
            <p className="text-xs text-muted-foreground">Match column headers by name. Drag order determines sort + output order.</p>
            <div className="space-y-1.5">
              {draft.fields.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    value={f}
                    onChange={(e) => updateField(i, e.target.value)}
                    className="flex-1"
                    placeholder="Field name as it appears in the grid header"
                  />
                  <Button variant="ghost" size="icon" onClick={() => moveField(i, -1)} disabled={i === 0} className="h-8 w-8">
                    ↑
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveField(i, 1)} disabled={i === draft.fields.length - 1} className="h-8 w-8">
                    ↓
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeField(i)} className="h-8 w-8 text-destructive">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addField}>
              <Plus className="w-4 h-4 mr-1" /> Add Field
            </Button>
          </div>

          {/* Sheet-to-day mapping */}
          <div className="space-y-2">
            <Label className="font-semibold">Sheet Name → Day Mapping</Label>
            <p className="text-xs text-muted-foreground">Maps Excel sheet tabs to day abbreviations in the output.</p>
            <div className="space-y-1.5">
              {Object.entries(draft.days).map(([sheet, abbr]) => (
                <div key={sheet} className="flex items-center gap-2">
                  <Input
                    value={sheet}
                    onChange={(e) => {
                      const rest = Object.fromEntries(Object.entries(draft.days).filter(([k]) => k !== sheet));
                      sync({ ...draft, days: { ...rest, [e.target.value]: abbr } });
                    }}
                    className="flex-1"
                    placeholder="Sheet tab name"
                  />
                  <span className="text-muted-foreground text-sm">→</span>
                  <Input
                    value={abbr}
                    onChange={(e) => updateDay(sheet, e.target.value)}
                    className="w-20"
                    placeholder="Mon"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeDay(sheet)} className="h-8 w-8 text-destructive">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addDay}>
              <Plus className="w-4 h-4 mr-1" /> Add Sheet
            </Button>
          </div>

          {/* Header row */}
          <div className="space-y-2">
            <Label className="font-semibold">Header Row Number (1-indexed)</Label>
            <Input
              type="number"
              min={1}
              value={draft.headerRow}
              onChange={(e) => sync({ ...draft, headerRow: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="w-24"
            />
          </div>

          {/* Coach-only cells */}
          <div className="space-y-2">
            <Label className="font-semibold">Coach-Only Cell Values (one per line)</Label>
            <p className="text-xs text-muted-foreground">Cells containing just a coach name (no team) — skipped as practice entries.</p>
            <Textarea
              value={draft.coachOnly.join("\n")}
              onChange={(e) => sync({ ...draft, coachOnly: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
              rows={3}
              placeholder="Joe Malachino"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset to Defaults
          </Button>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}