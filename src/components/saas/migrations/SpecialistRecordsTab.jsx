import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Edit3, Check, X, Ban, Trash2, Plus, RotateCcw } from "lucide-react";

const GUARDIAN_FIELDS = [
  { key: "first_name", label: "First Name" }, { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
  { key: "street_address", label: "Address" }, { key: "city", label: "City" },
  { key: "state", label: "State" }, { key: "zip_code", label: "ZIP" },
  { key: "household_id", label: "Household ID" }, { key: "is_team_parent", label: "Team Parent" },
];

const PLAYER_FIELDS = [
  { key: "first_name", label: "First Name" }, { key: "last_name", label: "Last Name" },
  { key: "date_of_birth", label: "DOB" }, { key: "gender", label: "Gender" },
  { key: "team_name", label: "Team" }, { key: "program_title", label: "Program" },
  { key: "guardian_email", label: "Guardian Email" }, { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
];

const TEAM_FIELDS = [
  { key: "name", label: "Team Name" }, { key: "age_group", label: "Age Group" },
  { key: "gender", label: "Gender" }, { key: "playing_format", label: "Format" },
  { key: "season", label: "Season" },
];

export default function SpecialistRecordsTab({ job, onFixed }) {
  const { toast } = useToast();
  const [entity, setEntity] = useState("players");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // { index, field }
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({});
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);

  const staging = job.staging_data || {};
  const guardians = staging.guardians || [];
  const players = staging.players || [];
  const teams = (job.team_sheet && job.team_sheet.length > 0) ? job.team_sheet : (staging.teams || []);

  const source = entity === "guardians" ? guardians : entity === "players" ? players : teams;
  const fields = entity === "guardians" ? GUARDIAN_FIELDS : entity === "players" ? PLAYER_FIELDS : TEAM_FIELDS;
  const term = query.trim().toLowerCase();
  const filtered = source.map((r, i) => ({ ...r, _idx: i })).filter((r) => !r._deleted && (!term || JSON.stringify(r).toLowerCase().includes(term)));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 50) - 1));
  const visible = filtered.slice(currentPage * 50, (currentPage + 1) * 50);

  const call = async (label, payload, msg) => {
    setBusy(label);
    try {
      await base44.functions.invoke("migration-approve-and-run", { migrationJobId: job.id, ...payload });
      setEditing(null);
      setSelected([]);
      await onFixed();
      toast({ title: msg || "Saved" });
    } catch (e) {
      toast({ title: "Failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (idx, field, current) => {
    setEditing({ idx, field });
    setEditValue(current === true ? "Yes" : current === false ? "No" : String(current ?? ""));
  };

  const saveEdit = () => {
    if (!editing) return;
    const val = fields.find((f) => f.key === editing.field)?.key === "is_team_parent"
      ? editValue.toLowerCase() === "yes"
      : editValue;
    call(`edit-${editing.idx}`, { action: "fix_record", entity, index: editing.idx, field: editing.field, value: val }, "Record updated");
  };

  const exclude = (idx) => call(`exc-${idx}`, { action: "exclude_record", entity, index: idx }, "Record excluded");
  const restore = (idx) => call(`rst-${idx}`, { action: "restore_record", entity, index: idx }, "Record restored");
  const remove = (idx) => call(`del-${idx}`, { action: "delete_record", entity, index: idx }, "Record deleted");

  const addRecord = () => {
    call("add", { action: "add_record", entity, record: newRecord }, "Record added");
    setShowAdd(false);
    setNewRecord({});
  };

  return (
    <div className="space-y-2">
      {busy && <p role="status" className="text-xs text-primary flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving changes…</p>}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1">
          {["players", "guardians", "teams"].map((e) => (
            <button key={e} onClick={() => { setEntity(e); setPage(0); setEditing(null); setSelected([]); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                entity === e ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {e} ({e === "guardians" ? guardians.length : e === "players" ? players.length : teams.length})
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[120px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); setSelected([]); }} placeholder="Search…" className="pl-8 h-8 text-xs" />
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Click a pencil to edit a value. Changes apply directly to staged import records.</p>
      {selected.length > 0 && <div className="flex flex-wrap items-center gap-2 text-xs"><strong>{selected.length} selected</strong>{['skip', 'ignore', 'delete', 'restore'].map((operation) => <Button key={operation} size="sm" variant="outline" disabled={!!busy} onClick={() => call(`bulk-${operation}`, { action: 'bulk_records', entity, indices: selected, operation }, `${selected.length} records: ${operation}`)}>{operation}</Button>)}</div>}
      {showAdd && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
          <p className="text-xs font-bold text-emerald-800">Add new {entity.slice(0, -1)} record</p>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((f) => (
              <Input key={f.key} placeholder={f.label} value={newRecord[f.key] || ""}
                onChange={(e) => setNewRecord({ ...newRecord, [f.key]: e.target.value })}
                className="h-8 text-xs" />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addRecord} disabled={!!busy} className="gap-1">
              {busy === "add" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No records.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-2"><input aria-label="Select displayed records" type="checkbox" disabled={!!busy} checked={visible.length > 0 && visible.every((r) => selected.includes(r._idx))} onChange={(e) => setSelected(e.target.checked ? visible.map((r) => r._idx) : [])} /></th>
                <th className="px-2">Review status</th>
                {fields.map((f) => <th key={f.key} className="text-left font-semibold text-slate-600 px-2 py-1.5 whitespace-nowrap">{f.label}</th>)}
                <th className="px-2 py-1.5 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r._idx} className={`border-t border-slate-100 hover:bg-slate-50 ${r._excluded ? "opacity-40" : ""}`}>
                  <td className="px-2"><input type="checkbox" aria-label={`Select row ${r._idx + 1}`} disabled={!!busy} checked={selected.includes(r._idx)} onChange={(e) => setSelected(e.target.checked ? [...selected, r._idx] : selected.filter((i) => i !== r._idx))} /></td>
                  <td className="px-2"><Badge variant="outline" className="text-[10px]">{r._review_method || (r._excluded ? 'Skipped' : 'Pending review')}</Badge></td>
                  {fields.map((f) => {
                    const val = r[f.key];
                    const display = val === true ? "Yes" : val === false ? "No" : Array.isArray(val) ? val.join("; ") : (val ?? "");
                    const isEditing = editing?.idx === r._idx && editing?.field === f.key;
                    return (
                      <td key={f.key} className="px-2 py-1.5 text-slate-700 max-w-[160px] truncate" title={String(display)}>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                              className="h-6 text-xs px-1" />
                            <button onClick={saveEdit} disabled={!!busy}><Check className="w-3 h-3 text-emerald-600" /></button>
                            <button onClick={() => setEditing(null)}><X className="w-3 h-3 text-slate-400" /></button>
                          </div>
                        ) : (
                          <span onClick={() => startEdit(r._idx, f.key, val)} className="cursor-pointer hover:bg-slate-100 rounded px-0.5 inline-flex items-center gap-0.5">
                            {display || "—"}
                            <Edit3 className="w-3 h-3 text-primary shrink-0" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      {r._excluded ? (
                        <button title="Restore" onClick={() => restore(r._idx)} disabled={!!busy}>
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      ) : (
                        <button title="Exclude" onClick={() => exclude(r._idx)} disabled={!!busy}>
                          <Ban className="w-3.5 h-3.5 text-amber-500" />
                        </button>
                      )}
                      <button title="Delete" onClick={() => remove(r._idx)} disabled={!!busy}>
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-2 p-2 text-xs text-muted-foreground">
            <Button size="sm" variant="outline" disabled={currentPage === 0 || !!busy} onClick={() => { setPage(currentPage - 1); setSelected([]); setEditing(null); }}>Previous</Button>
            <span>{currentPage * 50 + 1}–{Math.min((currentPage + 1) * 50, filtered.length)} of {filtered.length}</span>
            <Button size="sm" variant="outline" disabled={(currentPage + 1) * 50 >= filtered.length || !!busy} onClick={() => { setPage(currentPage + 1); setSelected([]); setEditing(null); }}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}