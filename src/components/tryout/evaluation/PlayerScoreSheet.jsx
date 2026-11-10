import { useTerminology } from "@/hooks/useTerminology";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Check, Loader2, WifiOff, EyeOff } from "lucide-react";
import {
  RECOMMENDATIONS,
  recommendationLabel,
  recommendationTone,
  gradeTone,
} from "@/lib/evaluationCriteria";
import { draftFor, putDraft, pushDraft } from "@/lib/evalDrafts";
import ScoreScale from "./ScoreScale";
import { PlayerReviewEditor } from '../PlayerRetentionReview';
import { supabase } from "@/integrations/supabase/client";
import { gradeForRole } from "@/lib/roleRating";
import { reviewLabel } from "@/lib/playerRetention";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

/**
 * One player's evaluation. Everything autosaves: the draft lands on the device
 * first and is pushed to the server right after, so the sheet keeps working when
 * the field has no signal.
 */
export default function PlayerScoreSheet({ open, row, criteria, canSeeOthers, position, onNavigate, onClose, retention }) {
  const terms = useTerminology();
  const SCALE_LABELS = terms.scale;
  const roles = terms.teamRoles;
  const [role, setRole] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);
  const canSetRole = !!(retention?.allowed && retention?.season && row?.player_id);
  const [scores, setScores] = useState({});
  const [grade, setGrade] = useState(0);
  const [recommendation, setRecommendation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("idle");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    const draft = draftFor(row.event_id, row.player_id);
    const source = draft || row.mine || {};
    setScores(source.scores || {});
    setGrade(source.overall_grade || 0);
    setRecommendation(source.recommendation || "");
    setNotes(source.notes || "");
    setStatus(draft?.pending ? "device" : row.mine ? "saved" : "idle");
    setRole(retention?.reviewFor(row.player_id)?.team_role || "");
    setDirty(false);
  }, [open, row?.registration_id]);

  // Picking a role is the overall rating and also the player's season team role.
  const pickRole = async (key) => {
    const next = role === key ? "" : key;
    haptic(next ? "success" : "tap");
    setRole(next);
    setGrade(gradeForRole(roles, next));
    setDirty(true);
    if (!canSetRole) return;
    setRoleSaving(true);
    try {
      const review = retention.reviewFor(row.player_id);
      const value = next || "";
      let result = review
        ? await supabase.from("player_season_reviews").update({ team_role: value }).eq("id", review.id).eq("club_id", retention.clubId)
        : await supabase.from("player_season_reviews").insert({ club_id: retention.clubId, player_id: row.player_id, season: retention.season, intent: "returning", team_role: value });
      if (result.error?.code === "23505") {
        // Someone else created this season's review first: update it instead.
        result = await supabase.from("player_season_reviews").update({ team_role: value }).eq("club_id", retention.clubId).eq("player_id", row.player_id).eq("season", retention.season);
      }
      if (result.error) throw result.error;
      await retention.refresh();
    } catch (e) {
      toast.error(`Team role not saved: ${e.message || "try again"}`);
    } finally {
      setRoleSaving(false);
    }
  };

  const push = async () => {
    if (!row) return;
    const hasAny = Object.keys(scores).length > 0 || grade > 0 || !!recommendation || !!notes.trim();
    const draft = {
      event_id: row.event_id,
      registration_id: row.registration_id,
      player_id: row.player_id,
      player_name: row.player_name,
      scores,
      overall_grade: grade,
      recommendation,
      notes,
      saved_at: new Date().toISOString(),
      pending: !hasAny,
    };
    putDraft(draft);
    if (!hasAny) {
      setDirty(false);
      return;
    }
    setStatus("saving");
    try {
      await pushDraft(draft);
      setStatus("saved");
      setDirty(false);
    } catch {
      putDraft({ ...draft, pending: true });
      setStatus("device");
      setDirty(false);
    }
  };

  // Debounced autosave once the coach has actually changed something.
  useEffect(() => {
    if (!open || !dirty) return;
    const t = setTimeout(() => { push(); }, 700);
    return () => clearTimeout(t);
  }, [scores, grade, recommendation, notes, dirty, open]);

  const move = async (direction) => {
    if (dirty) await push();
    onNavigate(direction);
  };

  const close = async () => {
    if (dirty) await push();
    onClose();
  };

  if (!row) return null;

  const others = (row.evaluators || []).filter((e) => !e.is_me);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border sticky top-0 bg-card z-10">
          <DialogTitle className="flex items-center gap-3 text-lg pr-8">
            {row.photo_url
              ? <img src={row.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border border-border shrink-0" />
              : <span className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono text-base font-bold shrink-0">{row.bib ? `#${row.bib}` : "—"}</span>}
            <span className="truncate">{row.player_name}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground pl-[60px] -mt-1">
            {row.photo_url && row.bib ? `Bib #${row.bib} · ` : ""}
            {row.age != null ? `Age ${row.age}` : "Age unknown"}
            {row.age_group ? ` · ${row.age_group}` : ""}
            {row.player_gender ? ` · ${row.player_gender}` : ""}
            {position ? ` · Player ${position.index + 1} of ${position.total}` : ""}
          </p>
        </DialogHeader>

        <div className="p-4 space-y-5">
          {retention && <PlayerReviewEditor key={row.player_id} playerId={row.player_id} playerName={row.player_name} retention={retention} />}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Criteria</p>
            {criteria.map((c) => (
              <div key={c.key} className="rounded-xl bg-muted/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex items-baseline justify-between sm:block gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{scores[c.key] ? SCALE_LABELS[scores[c.key]] : "Tap a score"}</p>
                </div>
                <ScoreScale
                  label={c.label}
                  value={scores[c.key] || 0}
                  onChange={(v) => { haptic(); setScores((s) => ({ ...s, [c.key]: v })); setDirty(true); }}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wider text-foreground">Overall rating · Team role</p>
              {roleSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Overall rating">
              {roles.map((r, i) => (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={role === r.key}
                  onClick={() => pickRole(r.key)}
                  className={`min-h-[56px] rounded-xl border-2 px-3 text-left text-sm font-bold transition-all active:scale-[0.97] ${i === 0 ? "col-span-2" : ""} ${
                    role === r.key ? "bg-foreground text-background border-foreground shadow-lg" : "bg-card text-foreground border-border"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {role ? `Saved as ${row.player_name.split(" ")[0]}'s team role${canSetRole ? ` for ${retention.season}` : " in this evaluation"}.` : "Tap the role this player earns. It also sets their team role."}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendation</p>
            <div className="grid grid-cols-2 gap-2">
              {RECOMMENDATIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => { setRecommendation(recommendation === r.value ? "" : r.value); setDirty(true); }}
                  className={`min-h-[52px] rounded-xl border px-3 text-sm font-semibold transition-colors active:scale-[0.99] ${
                    recommendation === r.value ? r.tone : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
            <Textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
              placeholder="What stood out, what to work on…"
              rows={3}
            />
          </div>

          {canSeeOthers ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Other coaches ({others.length})
              </p>
              {others.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nobody else has scored this player yet.</p>
              ) : (
                others.map((other) => (
                  <div key={other.email} className="rounded-lg border border-border p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{other.name}</span>
                      <Badge className={`${gradeTone(other.overall_grade)} border-transparent`}>
                        {other.overall_grade ? `${other.overall_grade}/5` : "—"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {criteria.map((c) => (
                        <span key={c.key}>{c.label}: {other.scores?.[c.key] || "—"}</span>
                      ))}
                    </div>
                    {other.recommendation && (
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${recommendationTone(other.recommendation)}`}>
                        {recommendationLabel(other.recommendation)}
                      </span>
                    )}
                    {other.notes && <p className="text-xs text-muted-foreground">{other.notes}</p>}
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 border border-dashed border-border rounded-lg p-3">
              <EyeOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Other coaches' scores stay hidden until your club admin shares them for this session.
              {row.evaluations_count > 0 ? ` ${row.evaluations_count} coach${row.evaluations_count > 1 ? "es have" : " has"} scored this player so far.` : ""}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
            {status === "saving" && (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>)}
            {status === "saved" && (<><Check className="w-3.5 h-3.5 text-status-success-700" /> Saved</>)}
            {status === "device" && (<><WifiOff className="w-3.5 h-3.5 text-status-warning-700" /> Saved on this device — will sync</>)}
            {status === "idle" && "Autosaves as you score"}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" className="h-11" onClick={() => move(-1)} disabled={!position || position.index === 0}>
              <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button className="h-11 px-5" onClick={() => move(1)} disabled={!position || position.index >= position.total - 1}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}