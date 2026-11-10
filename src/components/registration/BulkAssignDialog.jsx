import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

const UNCHANGED = "__unchanged__";

/**
 * Generic bulk-assign dialog: pick rows from a filtered list, choose new
 * values for one or more fields, and apply them in a single batch.
 *
 * Props:
 * - open, onOpenChange
 * - title
 * - items: array of records (already filtered by the parent)
 * - getItemLabel: (item) => string shown in the list
 * - fields: [{ key, label, options: [{value, label}], optional?: bool }]
 *     value UNCHANGED means "leave this field alone"
 * - onApply: async (selectedIds, values) => {}  — values is { [key]: resolvedValue }
 * - idKey: defaults to "id"
 */
export default function BulkAssignDialog({
  open, onOpenChange, title, items = [], getItemLabel, fields = [], onApply, idKey = "id",
}) {
  const [selected, setSelected] = useState({});
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, UNCHANGED])));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((it) => (getItemLabel(it) || "").toLowerCase().includes(q));
  }, [items, search, getItemLabel]);

  const allSelected = filteredItems.length > 0 && filteredItems.every((it) => selected[it[idKey]]);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggleAll = () => {
    const next = { ...selected };
    for (const it of filteredItems) next[it[idKey]] = !allSelected;
    setSelected(next);
  };

  const toggleOne = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const reset = () => { setSelected({}); setValues(Object.fromEntries(fields.map((f) => [f.key, UNCHANGED]))); setSearch(""); };

  const handleClose = () => { reset(); onOpenChange(false); };

  const handleApply = async () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) { toast.error("Select at least one row."); return; }
    const resolved = {};
    for (const f of fields) {
      const v = values[f.key];
      if (v !== UNCHANGED) resolved[f.key] = f.optional && v === "__clear__" ? "" : v;
    }
    if (Object.keys(resolved).length === 0) { toast.error("Choose at least one field to update."); return; }
    setSaving(true);
    try {
      await onApply(ids, resolved);
      toast.success(`Updated ${ids.length} ${ids.length === 1 ? "row" : "rows"}`);
      handleClose();
    } catch {
      toast.error("Bulk update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          {/* Field selectors */}
          <div className="space-y-2">
            {fields.map((f) => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Select value={values[f.key]} onValueChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNCHANGED}>— No change —</SelectItem>
                    {f.optional && <SelectItem value="__clear__">— Clear —</SelectItem>}
                    {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Search + select all */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
              <Input placeholder="Filter list..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={toggleAll} disabled={filteredItems.length === 0}>
              {allSelected ? "Clear" : "All"}
            </Button>
          </div>

          {/* List */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-md flex-1 overflow-auto min-h-[160px] max-h-[260px]">
            {filteredItems.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">No rows match the current filters.</div>
            ) : filteredItems.map((it) => (
              <label key={it[idKey]} className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <Checkbox checked={!!selected[it[idKey]]} onCheckedChange={() => toggleOne(it[idKey])} />
                <span className="text-xs truncate">{getItemLabel(it)}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">{selectedCount} selected</p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleApply} disabled={saving || selectedCount === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Apply to ${selectedCount}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}