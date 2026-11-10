import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Loader2, RefreshCw, Settings2, ShieldAlert, Trophy, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { blocksOwnChild, criteriaFor, eventsForUser, isOwnChild } from "@/lib/evaluationCriteria";
import { cacheRows, cachedRows, flushPending, readDrafts } from "@/lib/evalDrafts";
import { sessionOptionLabel } from "@/lib/tryoutDashboard";
import EvaluationPlayerList from "./EvaluationPlayerList";
import PlayerScoreSheet from "./PlayerScoreSheet";
import EvaluationSettingsDialog from "./EvaluationSettingsDialog";
import AdminEvaluationResults from "./AdminEvaluationResults";

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
    <div className="space-y-4">
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

          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-foreground">Your scoring progress</span>
              <span className="text-muted-foreground">{scoredByMe} of {scorable.length} players</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-action transition-all"
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

          <div className="flex flex-wrap items-center gap-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or bib"
              className="max-w-[220px]"
            />
            <div className="flex items-center gap-2">
              <Switch id="hide-scored" checked={hideScored} onCheckedChange={setHideScored} />
              <Label htmlFor="hide-scored" className="text-xs text-muted-foreground">Hide players you've scored</Label>
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
              canSeeOthers={!!data?.can_see_others}
              onOpen={(index) => setSheetIndex(index)}
            />
          )}

          <PlayerScoreSheet
            open={sheetIndex != null}
            row={sheetRow}
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