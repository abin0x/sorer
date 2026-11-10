import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SOURCES = ["TeamSnap", "SportsEngine", "GotSport", "LeagueApps", "Spreadsheets", "Other"];
const PATHS = [
  { v: "upload", t: "Upload my data", d: "Drop in your files" },
  { v: "known_system", t: "Import from another system", d: "TeamSnap, SportsEngine and more" },
  { v: "fresh", t: "Start fresh", d: "No import, build as you go" },
  { v: "assisted", t: "Have the Club Rudder team do it", d: "A specialist works alongside you" },
];

const zones = () => {
  try { return Intl.supportedValuesOf("timeZone"); } catch { return ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"]; }
};

const initial = (club, journey) => ({
  name: club?.name || "", logo_url: club?.logo_url || "",
  primary_color: club?.primary_color || "#399F7D", secondary_color: club?.secondary_color || "#F59E0B",
  timezone: club?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  branches: [{ name: "", city: "" }],
  season_naming: club?.season_naming || "2026-2027",
  season_start_month: club?.season_start_month || 8, season_end_month: club?.season_end_month || 6,
  age_group_convention: club?.age_group_convention || "u_age",
  start_path: club?.start_path || (journey?.source_system ? "known_system" : ""),
  source_system: club?.source_system || journey?.source_system || "",
  ...(journey?.draft || {}),
});

export default function StageAProfile({ club, journey, onSave, onDraft, saving }) {
  const [f, setF] = useState(() => initial(club, journey));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const first = useRef(true);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  // Autosave the draft so the form resumes exactly as left, on any device.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => onDraft(f), 1500);
    return () => clearTimeout(t);
  }, [f]);

  const uploadLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
    set({ logo_url: file_url });
    setUploading(false);
  };
  const setBranch = (i, patch) => set({ branches: f.branches.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  const submit = async () => {
    if (!f.name.trim()) return setError("Add your club name.");
    if (!f.start_path) return setError("Choose how you would like to start.");
    setError("");
    try { await onSave({ ...f, branches: f.branches.filter((b) => b.name.trim()) }); }
    catch (e) { setError(e?.response?.data?.error || e.message); }
  };

  return (
    <div className="space-y-6 mt-3 p-4 rounded-xl border border-border bg-muted/30">
      <section className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Club name</Label><Input value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Select value={f.timezone} onValueChange={(v) => set({ timezone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{zones().map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            {f.logo_url && <img src={f.logo_url} alt="Club logo" className="w-10 h-10 rounded object-contain border bg-white" />}
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer border rounded-md px-3 py-2 bg-background hover:bg-accent">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
            </label>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="space-y-1.5"><Label>Primary color</Label><input type="color" value={f.primary_color} onChange={(e) => set({ primary_color: e.target.value })} className="block h-10 w-16 rounded border cursor-pointer" /></div>
          <div className="space-y-1.5"><Label>Accent color</Label><input type="color" value={f.secondary_color} onChange={(e) => set({ secondary_color: e.target.value })} className="block h-10 w-16 rounded border cursor-pointer" /></div>
        </div>
      </section>

      <section className="space-y-2">
        <Label>Branches</Label>
        <p className="text-xs text-muted-foreground">One location? Add just one. New names are added to your branches.</p>
        {f.branches.map((b, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Branch name" value={b.name} onChange={(e) => setBranch(i, { name: e.target.value })} />
            <Input placeholder="City" value={b.city} onChange={(e) => setBranch(i, { city: e.target.value })} />
            {f.branches.length > 1 && <Button size="icon" variant="ghost" onClick={() => set({ branches: f.branches.filter((_, j) => j !== i) })} aria-label="Remove branch"><Trash2 className="w-4 h-4" /></Button>}
          </div>
        ))}
        <Button size="sm" variant="outline" className="gap-1" onClick={() => set({ branches: [...f.branches, { name: "", city: "" }] })}><Plus className="w-3.5 h-3.5" />Add branch</Button>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Season naming</Label><Input value={f.season_naming} onChange={(e) => set({ season_naming: e.target.value })} placeholder="2026-2027" /></div>
        <div className="space-y-1.5">
          <Label>Age-group convention</Label>
          <Select value={f.age_group_convention} onValueChange={(v) => set({ age_group_convention: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="u_age">U-age (U12)</SelectItem><SelectItem value="birth_year">Birth year (2014)</SelectItem></SelectContent>
          </Select>
        </div>
        {[["season_start_month", "Season usually starts"], ["season_end_month", "Season usually ends"]].map(([k, label]) => (
          <div key={k} className="space-y-1.5">
            <Label>{label}</Label>
            <Select value={String(f[k])} onValueChange={(v) => set({ [k]: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <Label>How would you like to start?</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          {PATHS.map((p) => (
            <button key={p.v} type="button" onClick={() => set({ start_path: p.v })}
              className={`text-left p-3 rounded-lg border transition ${f.start_path === p.v ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
              <div className="text-sm font-semibold">{p.t}</div><div className="text-xs text-muted-foreground">{p.d}</div>
            </button>
          ))}
        </div>
        {f.start_path === "known_system" && (
          <Select value={f.source_system} onValueChange={(v) => set({ source_system: v })}>
            <SelectTrigger className="sm:w-64"><SelectValue placeholder="Which system?" /></SelectTrigger>
            <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={submit} disabled={saving || uploading} className="gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save profile and continue
      </Button>
    </div>
  );
}