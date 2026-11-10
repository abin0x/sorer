import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Wrench, UserCheck, Loader2, Shield, Users, FileWarning, ListChecks, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import ImportFileGuide from '@/components/migration/ImportFileGuide';

const GENDER_OPTS = ["Boys", "Girls", "Boys and Girls"];
const FORMAT_OPTS = ["4v4", "7v7", "9v9", "11v11"];

const DUP_ACTIONS = [
  { value: "merge", label: "Merge into one", desc: "Combine all duplicates, filling missing fields from each" },
  { value: "delete", label: "Keep first only", desc: "Keep the first record, delete the rest" },
  { value: "skip", label: "Skip all", desc: "Don't import any of these records" },
];

export default function ClientReviewStep({ job, onSubmitted, onReupload }) {
  const { toast } = useToast();
  const staging = job.staging_data || {};
  const counts = job.preview_counts || {};
  const issues = staging.issues || [];
  const teams = staging.teams || [];
  const warnings = job.warnings || [];
  const duplicates = staging.duplicates || [];
  const decisionsConfig = staging.decisions || [];

  const [teamSheet, setTeamSheet] = useState(
    (job.team_sheet && job.team_sheet.length > 0 ? job.team_sheet : teams.map((t) => ({
      name: t.name, age_group: "", gender: "", playing_format: "", season: "", location_id: "", coach_id: "",
    })))
  );
  const [decisions, setDecisions] = useState(job.client_decisions || {});
  const [dupDecisions, setDupDecisions] = useState(job.duplicate_decisions || {});
  const [submitting, setSubmitting] = useState(false);

  const clientFixable = issues.filter((i) => i.category === "client_fixable" && i.type !== "duplicate");
  const needsHuman = issues.filter((i) => i.category === "needs_human_review");

  const teamSheetComplete = useMemo(
    () => teams.length === 0 || teamSheet.every((t) => t.playing_format && t.age_group),
    [teamSheet, teams.length]
  );
  const decisionsComplete = decisionsConfig.every((d) => decisions[d.key]);
  const unresolvedDups = duplicates.filter((d) => !dupDecisions[d.id]).length;

  const hasNoData = (counts.guardians ?? 0) === 0 && (counts.players ?? 0) === 0 && (counts.teams ?? 0) === 0;
  const canSubmit = teamSheetComplete && decisionsComplete && !hasNoData;

  const mergeAllDuplicates = () => {
    const all = {};
    duplicates.forEach((d) => { all[d.id] = "merge"; });
    setDupDecisions(all);
  };

  const updateTeam = (idx, field, value) => {
    setTeamSheet((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data } = await base44.functions.invoke("migrationRequests", {
        action: "submitReview",
        migrationJobId: job.id,
        team_sheet: teamSheet,
        client_decisions: decisions,
        duplicate_decisions: dupDecisions,
      });
      toast({ title: "Submitted for review", description: "A specialist will review your migration next." });
      onSubmitted?.(data.job);
    } catch (e) {
      toast({ title: "Couldn't submit", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-slate-900">Review your data</h2>
        <p className="text-sm text-slate-500 mt-1">
          We auto-mapped your export using the {job.competitor_source ? job.competitor_source.charAt(0).toUpperCase() + job.competitor_source.slice(1) : ""} template. Fix what you can below — then we'll hand it to a specialist.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4" /> We hit issues reading your files ({warnings.length})
          </div>
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
            </div>
          ))}
        </div>
      )}

      <ImportFileGuide />

      {hasNoData && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3 text-center">
          <p className="text-sm font-bold text-rose-900">No data was extracted from your files</p>
          <p className="text-xs text-rose-700">
            This usually means the file format wasn't recognized or the columns didn't match the expected layout.
            Check the warnings above, fix your file, and re-upload.
          </p>
          {onReupload && (
            <Button variant="outline" onClick={onReupload} className="gap-2">
              <Wrench className="w-4 h-4" /> Re-upload files
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: "guardians", label: "Guardians", icon: Users },
          { key: "players", label: "Players", icon: Shield },
          { key: "teams", label: "Teams", icon: Shield },
          { key: "exceptions", label: "Exceptions", icon: FileWarning },
          { key: "duplicates", label: "Duplicates", icon: Copy },
        ].map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.key} className="rounded-xl border border-slate-200 p-3 text-center">
              <Icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
              <div className="text-lg font-extrabold text-slate-900">{counts[row.key] ?? 0}</div>
              <div className="text-[11px] text-slate-500">{row.label}</div>
            </div>
          );
        })}
      </div>

      {/* Duplicate resolution */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
            <Copy className="w-4 h-4" /> Duplicates found ({duplicates.length})
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-700">
              We found records that look like duplicates. For each group, choose to merge them into one, keep only the first, or skip them entirely. Unresolved groups default to merge.
            </p>
            {unresolvedDups > 0 && (
              <Button variant="outline" size="sm" onClick={mergeAllDuplicates} className="text-xs shrink-0 ml-2">
                Merge all ({unresolvedDups} unresolved)
              </Button>
            )}
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {duplicates.map((dup) => (
              <div key={dup.id} className="rounded-lg border border-blue-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-900 uppercase">{dup.type}</span>
                    <p className="text-sm font-semibold text-slate-900">{dup.match_label}</p>
                  </div>
                  <span className="text-xs text-slate-500">{dup.records.length} records</span>
                </div>
                <div className="space-y-1">
                  {dup.records.map((r, ri) => (
                    <div key={ri} className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {r.display}
                    </div>
                  ))}
                </div>
                <Select
                  value={dupDecisions[dup.id] || ""}
                  onValueChange={(v) => setDupDecisions((prev) => ({ ...prev, [dup.id]: v }))}
                >
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Choose action…" /></SelectTrigger>
                  <SelectContent>
                    {DUP_ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{a.label}</span>
                          <span className="text-[10px] text-slate-500">{a.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {unresolvedDups > 0 && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {unresolvedDups} unresolved group(s) — they'll be merged by default. Review and override if needed.
            </p>
          )}
        </div>
      )}

      {clientFixable.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <Wrench className="w-4 h-4" /> Things you can fix ({clientFixable.length})
          </div>
          {clientFixable.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {issue.message}
            </div>
          ))}
          <p className="text-xs text-amber-700 pt-1">
            Missing emails and ambiguous dates can be corrected in your source file and re-uploaded, or noted here for the reviewer.
          </p>
        </div>
      )}

      {teams.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ListChecks className="w-4 h-4 text-primary" /> Team details ({teams.length} teams)
          </div>
          <p className="text-xs text-slate-500">
            Your export only has team names. Fill in the details for each team so we can create them correctly.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {teamSheet.map((team, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-lg bg-slate-50">
                <div className="col-span-2 sm:col-span-4">
                  <Label className="text-xs font-bold">{team.name}</Label>
                </div>
                <Input placeholder="Age group (U14)" value={team.age_group} onChange={(e) => updateTeam(idx, "age_group", e.target.value)} className="text-xs h-8" />
                <Select value={team.gender} onValueChange={(v) => updateTeam(idx, "gender", v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>{GENDER_OPTS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={team.playing_format} onValueChange={(v) => updateTeam(idx, "playing_format", v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Format" /></SelectTrigger>
                  <SelectContent>{FORMAT_OPTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Season (2026-2027)" value={team.season} onChange={(e) => updateTeam(idx, "season", e.target.value)} className="text-xs h-8" />
              </div>
            ))}
          </div>
          {!teamSheetComplete && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Every team needs at least an age group and playing format.
            </p>
          )}
        </div>
      )}

      {decisionsConfig.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ListChecks className="w-4 h-4 text-primary" /> A few decisions
          </div>
          {decisionsConfig.map((d) => (
            <div key={d.key} className="space-y-1.5">
              <p className="text-xs font-medium text-slate-700">{d.question}</p>
              <Select value={decisions[d.key] || ""} onValueChange={(v) => setDecisions((prev) => ({ ...prev, [d.key]: v }))}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  {d.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {needsHuman.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <UserCheck className="w-4 h-4 text-slate-500" /> What our specialist will handle ({needsHuman.length})
          </div>
          {needsHuman.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" /> {issue.message}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <UserCheck className="w-4.5 h-4.5 text-primary" />
        </div>
        <p className="text-sm text-slate-700">
          <span className="font-bold">When you submit, a real person takes over.</span> They'll review everything,
          handle the items above, and reach out if they need anything else.
        </p>
      </div>

      <Button disabled={!canSubmit || submitting} onClick={submit} className="w-full gap-2">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit for Specialist Review"}
      </Button>
      {!canSubmit && !hasNoData && (
        <p className="text-xs text-center text-slate-400">
          {(!teamSheetComplete && teams.length > 0) ? "Every team needs at least an age group and playing format." :
           "Complete the decisions to enable submit."}
        </p>
      )}
      {onReupload && !hasNoData && (
        <p className="text-xs text-center text-slate-400">
          Need to fix your files? <button onClick={onReupload} className="text-primary underline">Re-upload</button>
        </p>
      )}
    </div>
  );
}