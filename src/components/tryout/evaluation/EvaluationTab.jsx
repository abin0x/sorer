import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ClipboardList, Loader2, RefreshCw, Settings2, ShieldAlert, Trophy, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { blocksOwnChild, criteriaFor, eventsForUser, isOwnChild } from "@/lib/evaluationCriteria";
import { cacheRows, cachedRows, flushPending, readDrafts } from "@/lib/evalDrafts";
import { sessionOptionLabel } from "@/lib/tryoutDashboard";
import EvaluationPlayerList from "./EvaluationPlayerList";
import PlayerScoreSheet from "./PlayerScoreSheet";
import BibPad from "./BibPad";
import { Hash, Sun } from "lucide-react";
import EvaluationSettingsDialog from "./EvaluationSettingsDialog";
import AdminEvaluationResults from "./AdminEvaluationResults";
import { usePlayerRetention } from '@/hooks/usePlayerRetention';
import { RetentionWorkspace } from '../PlayerRetentionReview';

/**
 * The evaluation workspace. A coach only ever sees the sessions they are
 * assigned to evaluate and scores one player at a time on a phone; an admin gets
 * the same scoring list plus the combined ranking and the disagreement flags.
 */
export default function EvaluationTab({ plans, events, user, canManage, onChanged }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState("score");
  const [eventId, setEventId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  const [fieldMode, setFieldMode] = useState(false);
  useEffect(() => { try { setFieldMode(localStorage.getItem("cr-field-mode") === "1"); } catch {} }, []);
  const toggleField = () => setFieldMode((v) => { try { localStorage.setItem("cr-field-mode", v ? "0" : "1"); } catch {} return !v; });
  const [search, setSearch] = useState("");
  const [hideScored, setHideScored] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(null);

  const plansById = useMemo(() => Object.fromEntries((plans || []).map((p) => [p.id, p])), [plans]);
  const myEvents = useMemo(
    () => eventsForUser(events || [], plansById, user, canManage),
    [events, plansById, user, canManage]
  );

  // Land on the next session up, otherwise the last one held.
  useEffect(() => {
    if (eventId || !myEvents.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const next = myEvents
      .filter((e) => e.date >= today)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
    setEventId((next || myEvents[myEvents.length - 1]).id);
  }, [myEvents, eventId]);

  // Whatever only reached this device goes up as soon as the server is reachable.
  useEffect(() => {
    const retry = async () => {
      const { synced } = await flushPending();
      if (synced) {
        toast.success(`${synced} evaluation${synced > 1 ? "s" : ""} synced`);
        qc.invalidateQueries({ queryKey: ["tryoutEval"] });
      }
    };
    retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [qc]);

  const event = myEvents.find((e) => e.id === eventId) || null;
  const reviewSeason = plansById[event?.tryout_plan_id]?.season || event?.season_name || '';
  const retention = usePlayerRetention(reviewSeason);
  const criteria = criteriaFor(event);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["tryoutEval", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("tryout-evaluation", { action: "results", event_id: eventId });
        if (res.data?.error) throw new Error(res.data.error);
        cacheRows(eventId, res.data?.rows || []);
        return res.data;
      } catch (err) {
        const cached = cachedRows(eventId);
        if (cached) return { ok: true, offline: true, rows: cached, stats: {}, can_see_others: canManage };
        throw err;
      }
    },
  });

  const rows = data?.rows || [];
  const drafts = useMemo(() => readDrafts(), [data, sheetIndex]);
  const hiddenOwnChild = blocksOwnChild(event) && !canManage;
  const ownChildCount = hiddenOwnChild ? rows.filter((r) => isOwnChild(r, user)).length : 0;
  const scorable = hiddenOwnChild ? rows.filter((r) => !isOwnChild(r, user)) : rows;

  const filtered = scorable.filter((r) => {
    if (hideScored && r.mine && Object.keys(r.mine.scores || {}).length) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.player_name || "").toLowerCase().includes(q) || String(r.bib || "").includes(q);
  });

  const scoredByMe = scorable.filter((r) => r.mine && Object.keys(r.mine.scores || {}).length).length;
  const pendingCount = Object.values(drafts).filter((d) => d.pending).length;
  const sheetRow = sheetIndex != null ? filtered[sheetIndex] || null : null;

  if (!myEvents.length) {
    return (
      <div className="flex items-start gap-3 border border-border rounded-xl p-6 text-sm text-muted-foreground">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        {canManage
          ? "No tryout sessions yet — add them from the Tryout Matrix tab."
          : "You are not assigned to any tryout sessions yet. Your club admin adds coaches as evaluators on the session."}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${fieldMode ? "field-mode" : ""}`}>
      {canManage && (
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="score" className="gap-1.5"><ClipboardList className="w-4 h-4" /> Score players</TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5"><Trophy className="w-4 h-4" /> Results & ranking</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {mode === "results" && canManage ? (
        <AdminEvaluationResults plans={plans} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[240px]">
              <Label>Session</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger><SelectValue placeholder="Pick a session" /></SelectTrigger>
                <SelectContent>
                  {myEvents.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {sessionOptionLabel(e)}{e.field_name ? ` · ${e.field_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && event && (
              <Button variant="outline" onClick={() => setSettingsOpen(true)} className="gap-1.5">
                <Settings2 className="w-4 h-4" /> Evaluation settings
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Refresh the list">
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>

          {event && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{event.registration_count || 0} registered</span>
              <span>{event.checked_in_count || 0} checked in</span>
              <span>{event.evaluator_names?.length || 0} evaluators</span>
              <span className={event.evaluation_share_scores ? "" : "text-status-warning-700"}>
                {event.evaluation_share_scores
                  ? "Coaches can see each other's scores"
                  : "Coaches' scores are hidden from each other"}
              </span>
            </div>
          )}

          <RetentionWorkspace retention={retention} players={scorable} canManage={canManage} />

          <div className="rounded-2xl bg-primary text-primary-foreground p-5 shadow-md">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm opacity-80">Your scoring</p>
                <p className="text-4xl font-bold tracking-tight">{scoredByMe}<span className="text-xl opacity-70"> / {scorable.length}</span></p>
              </div>
              <p className="text-sm opacity-80 text-right">{scorable.length - scoredByMe} left to score</p>
            </div>
            <div className="mt-4 h-2.5 rounded-full bg-primary-foreground/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-foreground transition-all duration-500"
                style={{ width: `${scorable.length ? Math.round((scoredByMe / scorable.length) * 100) : 0}%` }}
              />
            </div>
          </div>

          {pendingCount > 0 && (
            <p className="text-xs text-status-warning-700 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              {pendingCount} evaluation{pendingCount > 1 ? "s" : ""} saved on this device — they sync when you're back online.
            </p>
          )}
          {data?.offline && (
            <p className="text-xs text-status-warning-700 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              Showing the last list saved on this device. Scoring still works and syncs later.
            </p>
          )}
          {error && (
            <div className="text-sm text-muted-foreground border border-border rounded-xl p-4 flex items-center gap-3">
              <span>Couldn't load this session. {error.message}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          )}

          <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-background/95 backdrop-blur flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPadOpen(true)} aria-label="Jump to bib number" className="h-12 px-4 rounded-2xl bg-foreground text-background font-black flex items-center gap-1.5 active:scale-95 transition"><Hash className="w-5 h-5" />Bib</button>
            <button type="button" onClick={toggleField} aria-pressed={fieldMode} aria-label="Sunlight field mode" className={`h-12 w-12 rounded-2xl border-2 grid place-items-center active:scale-95 transition ${fieldMode ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border"}`}><Sun className="w-5 h-5" /></button>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or bib"
                className="pl-10 h-12 rounded-2xl text-base"
                inputMode="search"
              />
            </div>
            <div className="flex gap-1.5" role="tablist" aria-label="Which players to show">
              {[[false, "All players"], [true, "To score"]].map(([value, text]) => (
                <button key={text} type="button" role="tab" aria-selected={hideScored === value} onClick={() => setHideScored(value)}
                  className={`h-10 px-4 rounded-full text-sm font-medium border transition-colors ${hideScored === value ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>
                  {text}
                </button>
              ))}
            </div>
          </div>

          {hiddenOwnChild && ownChildCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {ownChildCount} player{ownChildCount > 1 ? "s are" : " is"} kept off your list — you can't evaluate your own child.
            </p>
          )}

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <EvaluationPlayerList
              rows={filtered}
              retention={retention}
              canSeeOthers={!!data?.can_see_others}
              onOpen={(index) => setSheetIndex(index)}
            />
          )}

          <BibPad open={padOpen} onClose={() => setPadOpen(false)} rows={scorable} onPick={(r) => { setPadOpen(false); setSearch(""); setHideScored(false); const idx = scorable.indexOf(r); setSheetIndex(idx >= 0 ? idx : null); }} />
          <PlayerScoreSheet
            open={sheetIndex != null}
            row={sheetRow}
            retention={retention}
            criteria={criteria}
            canSeeOthers={!!data?.can_see_others}
            position={sheetRow ? { index: sheetIndex, total: filtered.length } : null}
            onNavigate={(direction) =>
              setSheetIndex((current) => {
                const next = (current ?? 0) + direction;
                return next >= 0 && next < filtered.length ? next : current;
              })
            }
            onClose={() => {
              setSheetIndex(null);
              qc.invalidateQueries({ queryKey: ["tryoutEval", eventId] });
              onChanged?.();
            }}
          />

          {canManage && event && (
            <EvaluationSettingsDialog
              event={event}
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              onSaved={() => { onChanged?.(); refetch(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}