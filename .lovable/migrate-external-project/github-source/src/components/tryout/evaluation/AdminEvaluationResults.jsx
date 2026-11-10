import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Loader2, TriangleAlert, Trophy, Users } from "lucide-react";
import { gradeTone } from "@/lib/evaluationCriteria";
import { sessionOptionLabel } from "@/lib/tryoutDashboard";
import EvaluatorBreakdownDialog from "./EvaluatorBreakdownDialog";

function Stat({ label, value, tone = "" }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className={`text-xl font-bold ${tone || "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

/**
 * What the club sees once coaches have scored: every evaluation, the average per
 * criterion, the combined ranking inside each age group and gender, and where
 * evaluators disagree strongly.
 */
export default function AdminEvaluationResults({ plans }) {
  const [planId, setPlanId] = useState("");
  const [detail, setDetail] = useState(null);

  const activePlans = plans || [];
  const selectedPlanId = planId || activePlans[0]?.id || "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["tryoutEvalResults", selectedPlanId],
    enabled: !!selectedPlanId,
    queryFn: async () => {
      const res = await base44.functions.invoke("tryout-evaluation", { action: "results", plan_id: selectedPlanId });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
  });

  const criteria = data?.criteria || [];
  const rows = data?.rows || [];
  const stats = data?.stats || {};
  const eventsById = useMemo(
    () => Object.fromEntries((data?.events || []).map((e) => [e.id, e])),
    [data]
  );

  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.group_key || "No age group · Open";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return [...map.entries()].map(([key, list]) => ({
      key,
      rows: list.sort(
        (a, b) => (a.rank || 999) - (b.rank || 999) || (b.aggregate?.overall || 0) - (a.aggregate?.overall || 0)
      ),
      scored: list.filter((r) => r.aggregate?.overall > 0).length,
    }));
  }, [rows]);

  if (!activePlans.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Set up a tryout first — evaluations collect once coaches start scoring players.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 flex-1 min-w-[240px]">
          <Label>Tryout</Label>
          <Select value={selectedPlanId} onValueChange={setPlanId}>
            <SelectTrigger><SelectValue placeholder="Pick a tryout" /></SelectTrigger>
            <SelectContent>
              {activePlans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}{p.season ? ` · ${p.season}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-sm text-muted-foreground border border-border rounded-xl p-4">
          Couldn't load the evaluations. {error.message}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Players scored" value={`${stats.scored || 0} of ${stats.players || 0}`} />
            <Stat label="Evaluations in" value={stats.evaluations || 0} />
            <Stat label="Coaches scoring" value={stats.evaluators || 0} />
            <Stat
              label="Evaluators disagree"
              value={stats.disagreements || 0}
              tone={stats.disagreements ? "text-status-warning-700" : ""}
            />
          </div>

          {!rows.length ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No players are registered in this tryout yet.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{group.key}</h3>
                  <span className="text-xs text-muted-foreground">
                    {group.scored} scored of {group.rows.length}
                  </span>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Session</TableHead>
                        {criteria.map((c) => (
                          <TableHead key={c.key} className="text-center whitespace-nowrap">{c.label}</TableHead>
                        ))}
                        <TableHead className="text-center">Combined</TableHead>
                        <TableHead className="text-center">Coaches</TableHead>
                        <TableHead>Flags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.rows.map((row) => {
                        const event = eventsById[row.event_id];
                        const agg = row.aggregate;
                        return (
                          <TableRow
                            key={row.registration_id}
                            className="cursor-pointer"
                            onClick={() => setDetail(row)}
                          >
                            <TableCell className="font-semibold text-muted-foreground">
                              {row.rank || "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {row.photo_url ? (
                                  <img src={row.photo_url} alt={row.player_name} className="w-8 h-8 rounded-full object-cover" />
                                ) : null}
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">{row.player_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {row.bib ? `Bib ${row.bib}` : "No bib"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {row.age != null ? row.age : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {event ? sessionOptionLabel(event) : "—"}
                            </TableCell>
                            {criteria.map((c) => (
                              <TableCell key={c.key} className="text-center text-sm">
                                {agg?.criteria?.[c.key] ?? "—"}
                              </TableCell>
                            ))}
                            <TableCell className="text-center">
                              {agg?.overall ? (
                                <Badge className={`${gradeTone(Math.round(agg.overall))} border-transparent`}>
                                  {agg.overall}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not scored</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {agg?.count || 0}
                            </TableCell>
                            <TableCell>
                              {agg?.disagreement ? (
                                <Badge className="bg-status-warning-50 text-status-warning-700 border-transparent gap-1">
                                  <TriangleAlert className="w-3 h-3" /> Split by {agg.spread || agg.criteria_spread}
                                </Badge>
                              ) : row.aggregate && row.aggregate.overall ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <ClipboardCheck className="w-3.5 h-3.5" /> Aligned
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}

          {!!rows.length && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Tap a player to see every coach's scores, notes and recommendations. Combined is the average of the
              evaluators' overall grades; a flag means they differ by two points or more, or split on the recommendation.
            </p>
          )}
        </>
      )}

      <EvaluatorBreakdownDialog
        open={!!detail}
        row={detail}
        criteria={criteria}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}