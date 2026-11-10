import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/lib/TenantContext";
import WarningsPanel from "@/components/gridimport/WarningsPanel";
import StagedTable from "@/components/gridimport/StagedTable";
import DiffPanel from "@/components/gridimport/DiffPanel";
import GoldenCheck from "@/components/gridimport/GoldenCheck";
import { DEFAULT_SETTINGS } from "@/lib/trainingGridParser";
import { stageGrid, reviewFlags, stagedFormatOf } from "@/lib/gridImport";
import { loadTeamPlatforms, loadWeekBookings, commitBatch } from "@/lib/gridStore";
import { addDays, snapToMonday, defaultSplit, detectConflicts, diffWeeks } from "@/lib/gridEngine";

export default function GridImport() {
  const { effectiveClubId: clubId } = useTenant();
  const [params] = useSearchParams();
  const [week, setWeek] = useState(params.get("week") || snapToMonday(new Date().toLocaleDateString("en-CA")));
  const [file, setFile] = useState(null);
  const [staged, setStaged] = useState(null);
  const [prev, setPrev] = useState([]);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(null);
  const [highlight, setHighlight] = useState(null);

  const bookings = staged?.bookings || [];
  const flags = useMemo(() => (staged ? [...staged.globalFlags, ...reviewFlags(bookings)] : []), [staged, bookings]);
  const conflicts = useMemo(
    () => detectConflicts(bookings, defaultSplit(bookings, {}, stagedFormatOf), stagedFormatOf),
    [bookings]
  );
  const errors = conflicts.filter((c) => c.severity === "error");
  const diff = useMemo(() => diffWeeks(prev, bookings), [prev, bookings]);

  const parse = async () => {
    setBusy(true);
    setDone(null);
    try {
      const monday = snapToMonday(week);
      setWeek(monday);
      const [saved, previous] = await Promise.all([loadTeamPlatforms(clubId), loadWeekBookings(clubId, addDays(monday, -7))]);
      setStaged(stageGrid(await file.arrayBuffer(), DEFAULT_SETTINGS, monday, saved));
      setPrev(previous);
    } catch (e) {
      toast.error(`Could not read that file: ${e.message}`);
    }
    setBusy(false);
  };

  const edit = (id, patch) =>
    setStaged((s) => {
      const team = s.bookings.find((b) => b.id === id)?.team;
      return { ...s, bookings: s.bookings.map((b) => (b.id === id || (patch.platform !== undefined && team && b.team === team) ? { ...b, ...patch } : b)) };
    });

  const jump = (id) => {
    setHighlight(id);
    document.getElementById(`row-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const commit = async () => {
    setBusy(true);
    try {
      setDone(await commitBatch({ clubId, weekStart: week, fileName: file.name, bookings, warnings: flags.map((f) => f.message), overrideReason: reason }));
      toast.success("Bookings committed");
    } catch (e) {
      toast.error(`Commit failed: ${e.message}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <h1 className="text-2xl font-bold">Training Grid Import</h1>
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div><div className="mb-1 text-xs font-medium">Week starting (Monday)</div><Input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="w-44" /></div>
          <div><div className="mb-1 text-xs font-medium">Grid file (.xlsx)</div><Input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files[0] || null)} /></div>
          <Button onClick={parse} disabled={!file || !clubId || busy}>{busy && !staged ? "Parsing…" : "Parse grid"}</Button>
        </CardContent>
      </Card>

      {staged && (
        <>
          <Card><CardHeader><CardTitle className="text-base">Warnings and blocking conflicts ({flags.length + errors.length})</CardTitle></CardHeader>
            <CardContent><WarningsPanel flags={flags} conflicts={conflicts} onJump={jump} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Parsed bookings ({bookings.length})</CardTitle></CardHeader>
            <CardContent>
              <StagedTable bookings={bookings} flaggedIds={new Set(flags.map((f) => f.bookingId))} highlight={highlight} onEdit={edit} />
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Changes vs. previous week</CardTitle></CardHeader>
            <CardContent><DiffPanel diff={diff} hasPrev={prev.length > 0} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Check parser output against the golden CSV</CardTitle></CardHeader>
            <CardContent><GoldenCheck records={staged.records} /></CardContent></Card>

          <Card>
            <CardContent className="space-y-3 pt-6">
              {errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-red-600">{errors.length} blocking conflicts. Fix them above, or commit anyway with a reason.</p>
                  <Input placeholder="Override reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button onClick={commit} disabled={busy || done || (errors.length > 0 && !reason.trim())}>
                  {busy ? "Committing…" : `Commit ${bookings.length} bookings`}
                </Button>
                {done && (
                  <span className="text-sm text-green-700">
                    Committed {done.total} bookings{done.stale ? ` (${done.stale} older bookings for this week were left in place)` : ""}.{" "}
                    <Link className="underline" to={`/FieldBoard?week=${week}`}>Open Field Board</Link>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}