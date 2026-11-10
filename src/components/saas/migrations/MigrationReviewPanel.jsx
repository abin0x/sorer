import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Undo2, Download } from "lucide-react";
import { exportToCsv } from "@/lib/csvUtils";

const GUARDIAN_FIELDS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "street_address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip_code", label: "ZIP" },
  { key: "household_id", label: "Household ID" },
  { key: "is_team_parent", label: "Team Parent" },
];

const PLAYER_FIELDS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "date_of_birth", label: "DOB" },
  { key: "gender", label: "Gender" },
  { key: "team_name", label: "Team" },
  { key: "program_title", label: "Program" },
  { key: "guardian_email", label: "Guardian Email" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
];

const TEAM_FIELDS = [
  { key: "name", label: "Team Name" },
  { key: "age_group", label: "Age Group" },
  { key: "gender", label: "Gender" },
  { key: "playing_format", label: "Format" },
  { key: "season", label: "Season" },
  { key: "location_id", label: "Branch ID" },
  { key: "coach_id", label: "Coach ID" },
];

const COUNT_KEYS = ["guardians", "players", "teams", "exceptions"];

const DECISION_LABELS = {
  club_column_meaning: { branch: "Maps to a branch/location", ignore: "Ignore — just the club name" },
  leading_account_columns: { duplicate: "Duplicates Parent 1 — ignored", separate: "Separate account — import as guardian", unsure: "Reviewer should check" },
  cancelled_registrations: { inactive: "Import as inactive", exclude: "Exclude entirely" },
};

export default function MigrationReviewPanel({ job, clubName, onReviewed }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(job.specialist_notes || "");
  const [busy, setBusy] = useState(null);

  const runAction = async (action) => {
    setBusy(action);
    try {
      await base44.functions.invoke("migration-approve-and-run", { migrationJobId: job.id, action, specialistNotes: notes });
      toast({ title: action === "approve" ? "Migration approved & imported" : "Sent back to club" });
      onReviewed();
    } catch (e) {
      toast({ title: "Action failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const counts = job.preview_counts || {};
  const warnings = job.warnings || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-lg">{clubName || job.club_name || "Club"}</h3>
        <p className="text-xs text-slate-500">Source: {job.competitor_source} · Submitted {job.submitted_at ? new Date(job.submitted_at).toLocaleString() : "—"}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {COUNT_KEYS.map((k) => (
          <div key={k} className="rounded-lg border border-slate-200 p-2 text-center">
            <div className="text-base font-extrabold">{counts[k] ?? 0}</div>
            <div className="text-[10px] text-slate-500 capitalize">{k}</div>
          </div>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1 max-h-32 overflow-y-auto">
          {warnings.map((w, i) => <p key={i} className="text-xs text-amber-800">⚠ {w}</p>)}
        </div>
      )}

      {/* Download staged data */}
      {(() => {
        const staging = job.staging_data || {};
        const guardians = staging.guardians || [];
        const players = staging.players || [];
        const teamSource = (job.team_sheet && job.team_sheet.length > 0) ? job.team_sheet : (staging.teams || []);
        const hasData = guardians.length > 0 || players.length > 0 || teamSource.length > 0;
        if (!hasData) return null;
        const slug = (job.club_name || "club").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return (
          <div className="rounded-lg border border-slate-200 p-3 space-y-2">
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Download staged data</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => exportToCsv(`${slug}-guardians.csv`, guardians, GUARDIAN_FIELDS)} disabled={guardians.length === 0}>
                Guardians ({guardians.length})
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportToCsv(`${slug}-players.csv`, players, PLAYER_FIELDS)} disabled={players.length === 0}>
                Players ({players.length})
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportToCsv(`${slug}-teams.csv`, teamSource, TEAM_FIELDS)} disabled={teamSource.length === 0}>
                Teams ({teamSource.length})
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Client-submitted team sheet */}
      {job.team_sheet && job.team_sheet.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-xs font-bold text-slate-700">Client-completed team sheet</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {job.team_sheet.map((t, i) => (
              <div key={i} className="text-xs text-slate-600 flex flex-wrap gap-x-3">
                <span className="font-semibold">{t.name}</span>
                <span>{t.age_group || "—"}</span>
                <span>{t.gender || "—"}</span>
                <span>{t.playing_format || "—"}</span>
                <span>{t.season || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client decisions */}
      {job.client_decisions && Object.keys(job.client_decisions).length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-1">
          <p className="text-xs font-bold text-slate-700">Client decisions</p>
          {Object.entries(job.client_decisions).map(([key, val]) => (
            <p key={key} className="text-xs text-slate-600">
              <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>{" "}
              {DECISION_LABELS[key]?.[val] || val}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Specialist note (shown to the club)</label>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Your data looks clean. Everything is ready to go." />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => runAction("approve")} disabled={!!busy} className="gap-2 flex-1">
          {busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve & Migrate
        </Button>
        <Button onClick={() => runAction("send_back")} disabled={!!busy} variant="outline" className="gap-2 flex-1">
          {busy === "send_back" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />} Send Back
        </Button>
      </div>
    </div>
  );
}