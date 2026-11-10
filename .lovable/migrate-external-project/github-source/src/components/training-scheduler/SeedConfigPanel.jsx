import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CalendarClock, CheckCircle2, AlertTriangle, Sparkles, FileSpreadsheet } from "lucide-react";
import { stageGrid } from "@/lib/gridImport";
import { loadSettings } from "@/lib/trainingGridSettings";
import { seedFromStagedBookings, seedFromBookings } from "@/lib/trainingSchedulerSeed";

export default function SeedConfigPanel({ teams, coaches, clubId, config, setConfig }) {
  const [mode, setMode] = useState(null); // "grid" | "week" | null
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [parseWarnings, setParseWarnings] = useState([]);
  const [busy, setBusy] = useState(false);

  const weekQuery = useQuery({
    queryKey: ["tsSeedWeek", clubId],
    queryFn: async () => {
      const page = await base44.entities.Booking.filter(
        { club_id: clubId, type: "training" },
        { sort: "-week_start", limit: 500, fields: ["id", "week_start", "team_name", "day", "start_min", "end_min", "coach_name"] }
      );
      const items = page.items || [];
      if (!items.length) return { rows: [], weekStart: null };
      const latest = items[0].week_start;
      return { rows: items.filter((b) => b.week_start === latest), weekStart: latest };
    },
    enabled: mode === "week" && !!clubId,
  });

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setParseWarnings([]);
    setPreview(null);
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result;
        const settings = loadSettings();
        const weekStart = new Date().toLocaleDateString("en-CA");
        const { bookings, globalFlags } = stageGrid(arrayBuffer, settings, weekStart);
        if (!bookings.length) {
          setError("No training sessions found in the file. Check the sheet/field mapping in the grid import settings.");
          setBusy(false);
          return;
        }
        const result = seedFromStagedBookings(bookings, teams, coaches);
        setParseWarnings(globalFlags.map((f) => f.message));
        setPreview({ ...result, source: "Imported grid" });
      } catch (err) {
        setError(`Could not parse file: ${err.message || err}`);
      } finally {
        setBusy(false);
      }
    };
    reader.onerror = () => { setError("Could not read file."); setBusy(false); };
    reader.readAsArrayBuffer(file);
  };

  const applyWeek = () => {
    if (!weekQuery.data?.rows?.length) return;
    const result = seedFromBookings(weekQuery.data.rows, teams, coaches);
    setPreview({ ...result, source: `Week of ${weekQuery.data.weekStart}` });
  };

  const applyPreview = () => {
    if (!preview?.team_prefs) return;
    setConfig({
      ...config,
      team_prefs: { ...config.team_prefs, ...preview.team_prefs },
    });
    setMode(null);
    setPreview(null);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-primary" /> Seed Team Preferences
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pre-fill each team's sessions/week, length, days, and coaches from an existing source instead of the defaults.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!mode && (
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => { setMode("grid"); setError(""); setPreview(null); setParseWarnings([]); }}
              className="flex flex-col items-start gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">Google Sheets / Excel</span>
              <span className="text-xs text-muted-foreground">Upload an .xlsx export of your training grid. Uses the existing grid parser and field mapping.</span>
            </button>
            <button
              onClick={() => { setMode("week"); setError(""); setPreview(null); }}
              className="flex flex-col items-start gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <CalendarClock className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">Previous Week</span>
              <span className="text-xs text-muted-foreground">Derive preferences from the most recent week's training bookings.</span>
            </button>
          </div>
        )}

        {mode === "grid" && (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" onClick={() => document.getElementById("seedGridFile")?.click()} disabled={busy}>
                <Upload className="w-3.5 h-3.5" /> {busy ? "Parsing…" : "Upload .xlsx"}
              </Button>
              <input id="seedGridFile" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
              <Button variant="ghost" size="sm" onClick={() => { setMode(null); setPreview(null); setError(""); setParseWarnings([]); }}>Cancel</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              In Google Sheets: File → Download → Microsoft Excel (.xlsx). Field and day mapping comes from your saved grid import settings.
            </p>
            {parseWarnings.length > 0 && (
              <details className="text-xs text-amber-700">
                <summary className="cursor-pointer">{parseWarnings.length} parser note(s)</summary>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {parseWarnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        {mode === "week" && (
          <div className="space-y-3">
            {weekQuery.isLoading && <p className="text-sm text-muted-foreground">Loading recent bookings…</p>}
            {weekQuery.isError && <p className="text-sm text-red-600">Could not load bookings.</p>}
            {weekQuery.data && !weekQuery.data.rows.length && (
              <p className="text-sm text-muted-foreground">No training bookings found for this club yet.</p>
            )}
            {weekQuery.data?.rows.length > 0 && !preview && (
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  Found <strong>{weekQuery.data.rows.length}</strong> training bookings for the week of{" "}
                  <strong>{weekQuery.data.weekStart}</strong>.
                </p>
                <Button size="sm" onClick={applyWeek}>Build Preferences from This Week</Button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setMode(null); setPreview(null); }}>Cancel</Button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-700">{error}</span>
          </div>
        )}

        {preview && (
          <div className="space-y-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">Preview — {preview.source}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-100 text-emerald-700">{preview.matched} teams matched</Badge>
              {preview.unmatched > 0 && (
                <Badge className="bg-amber-100 text-amber-700">{preview.unmatched} unmatched</Badge>
              )}
            </div>
            {preview.unmatchedNames?.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Unmatched names ({preview.unmatchedNames.length})</summary>
                <p className="mt-1">{preview.unmatchedNames.join(", ")}</p>
              </details>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={applyPreview}>Apply to Config</Button>
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Discard</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}