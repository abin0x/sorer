import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_CRITERIA } from "@/lib/evaluationCriteria";

const slug = (label) =>
  (label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Per-session evaluation setup: what coaches score, and what they may see. */
export default function EvaluationSettingsDialog({ event, open, onClose, onSaved }) {
  const [criteria, setCriteria] = useState([]);
  const [share, setShare] = useState(false);
  const [blockOwn, setBlockOwn] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const existing = event?.evaluation_criteria?.length ? event.evaluation_criteria : DEFAULT_CRITERIA;
    setCriteria(existing.map((c) => ({ ...c })));
    setShare(event?.evaluation_share_scores === true);
    setBlockOwn(event?.evaluation_block_own_child !== false);
  }, [open, event?.id]);

  const setLabel = (index, label) =>
    setCriteria((list) => list.map((c, i) => (i === index ? { ...c, label } : c)));

  const addCriterion = () => {
    const keys = new Set(criteria.map((c) => c.key));
    let key = "criterion";
    let n = 2;
    while (keys.has(key)) key = `criterion_${n++}`;
    setCriteria((list) => [...list, { key, label: "" }]);
  };

  const removeCriterion = (index) => setCriteria((list) => list.filter((_, i) => i !== index));

  const save = async () => {
    const cleaned = criteria
      .map((c) => {
        const label = (c.label || "").trim();
        const key = c.key || slug(label);
        return { key: key || `criterion_${Math.random().toString(36).slice(2, 6)}`, label: label || c.key };
      })
      .filter((c) => c.label);
    if (!cleaned.length) {
      toast.error("Add at least one criterion for coaches to score.");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.TryoutEvent.update(event.id, {
        evaluation_criteria: cleaned,
        evaluation_share_scores: share,
        evaluation_block_own_child: blockOwn,
      });
      toast.success("Evaluation settings saved");
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error?.message || "Could not save the settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluation settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label>What coaches score</Label>
            <p className="text-xs text-muted-foreground">Every player is rated 1-5 on each of these.</p>
            {criteria.map((c, index) => (
              <div key={`${c.key}-${index}`} className="flex items-center gap-2">
                <Input
                  value={c.label}
                  onChange={(e) => setLabel(index, e.target.value)}
                  placeholder="e.g. Technical skill"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCriterion(index)}
                  disabled={criteria.length <= 1}
                  aria-label="Remove criterion"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCriterion} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add criterion
            </Button>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Let coaches see each other's scores</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Off by default. Coaches only ever see their own scores until you turn this on.
              </p>
            </div>
            <Switch checked={share} onCheckedChange={setShare} />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Block a coach from evaluating their own child</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Their child is kept off that coach's scoring list, and the save is refused.
              </p>
            </div>
            <Switch checked={blockOwn} onCheckedChange={setBlockOwn} />
          </div>

          <p className="text-xs text-muted-foreground">
            These settings apply to this session
            {event?.date ? ` (${event.date}${event.start_time ? ` · ${event.start_time}` : ""})` : ""}. Assign the coaches
            who should score it as evaluators when you edit the session.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}