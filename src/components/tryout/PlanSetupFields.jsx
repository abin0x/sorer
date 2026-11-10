import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

/**
 * The registration block shared by the create and edit tryout-event dialogs:
 * tryout fee, registration window, max capacity and the waivers/documents a
 * family must complete. Controlled — `value` holds the fields, `onChange`
 * merges a patch back into the parent's form state.
 */
export default function PlanSetupFields({ value = {}, onChange }) {
  const documents = value.required_documents || [];
  const set = (key, v) => onChange({ [key]: v });

  const updateDoc = (i, patch) =>
    onChange({ required_documents: documents.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) });
  const addDoc = () => onChange({ required_documents: [...documents, { name: "", required: true }] });
  const removeDoc = (i) => onChange({ required_documents: documents.filter((_, idx) => idx !== i) });

  const windowInvalid =
    value.registration_open_date &&
    value.registration_close_date &&
    value.registration_close_date < value.registration_open_date;

  const numberOrEmpty = (key) => (e) => set(key, e.target.value === "" ? "" : Number(e.target.value));

  return (
    <div className="space-y-3 border border-border rounded-xl p-3">
      <p className="text-sm font-semibold text-foreground">Registration</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tryout fee</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={value.tryout_fee ?? ""}
            onChange={numberOrEmpty("tryout_fee")}
            placeholder="0 = free tryout"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Max capacity</Label>
          <Input
            type="number"
            min="0"
            value={value.max_capacity ?? ""}
            onChange={numberOrEmpty("max_capacity")}
            placeholder="Players accepted"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Registration opens</Label>
          <Input
            type="date"
            value={value.registration_open_date || ""}
            onChange={(e) => set("registration_open_date", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Registration closes</Label>
          <Input
            type="date"
            value={value.registration_close_date || ""}
            onChange={(e) => set("registration_close_date", e.target.value)}
          />
        </div>
      </div>

      {windowInvalid && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Registration closes before it opens — check the window.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Change deadline</Label>
          <Input
            type="date"
            value={value.change_deadline || ""}
            onChange={(e) => set("change_deadline", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">Last day families can reschedule or cancel online. Empty means the day before their session.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Refund policy</Label>
          <Input
            value={value.refund_policy || ""}
            onChange={(e) => set("refund_policy", e.target.value)}
            placeholder="e.g. Full refund 7 days before"
          />
          <p className="text-[11px] text-muted-foreground">Shown to families at checkout and on their status page.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Required waivers &amp; documents</Label>
        {documents.map((doc, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={doc.name || ""}
              onChange={(e) => updateDoc(i, { name: e.target.value })}
              placeholder="e.g. Medical waiver"
              className="flex-1"
            />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
              <Checkbox
                checked={doc.required !== false}
                onCheckedChange={(v) => updateDoc(i, { required: !!v })}
              />
              Required
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeDoc(i)}
              aria-label="Remove document"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addDoc}>
          <Plus className="w-3.5 h-3.5" /> Add document
        </Button>
      </div>
    </div>
  );
}