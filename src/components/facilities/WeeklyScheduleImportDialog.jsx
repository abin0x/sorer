import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet, Grid3x3 } from "lucide-react";
import { toast } from "sonner";
import { parseCsvFile } from "@/lib/csvUtils";
import { SCHEDULE_CSV_FIELDS, buildRecurringEvents } from "@/lib/scheduleImport";
import TrainingGridInput from "@/components/facilities/TrainingGridInput";

export default function WeeklyScheduleImportDialog({ open, onOpenChange, fields, teams, onImported }) {
  const [mode, setMode] = useState("csv"); // "csv" | "grid"
  const [file, setFile] = useState(null);
  const [gridRows, setGridRows] = useState([]);
  const [seasonStart, setSeasonStart] = useState(new Date().toISOString().split("T")[0]);
  const [weeks, setWeeks] = useState(12);
  const [defaultEventType, setDefaultEventType] = useState("practice");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const downloadTemplate = () => {
    const headers = SCHEDULE_CSV_FIELDS.map((f) => f.label);
    const sample = ["Field 1", "Mon", "4:00 PM", "5:30 PM", "U14 Jaguars", "practice", ""];
    const csv = [headers.join(","), sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "weekly_schedule_template.csv"; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (mode === "csv" && !file) return;
    if (mode === "grid" && gridRows.length === 0) { toast.error("Parse a training grid file first."); return; }
    if (fields.length === 0) { toast.error("Add at least one Field first (Manage Fields tab)."); return; }
    setImporting(true);
    setResults(null);
    try {
      const rows = mode === "grid" ? gridRows : await parseCsvFile(file, SCHEDULE_CSV_FIELDS);
      const { events, errors } = buildRecurringEvents({ rows, fields, teams, seasonStart, weeks: parseInt(weeks) || 1, defaultEventType });
      if (events.length === 0) {
        setResults({ created: 0, rows: rows.length, errors });
        return;
      }
      const CHUNK = 300;
      for (let i = 0; i < events.length; i += CHUNK) {
        await base44.entities.CalendarEvent.bulkCreate(events.slice(i, i + CHUNK));
      }
      setResults({ created: events.length, rows: rows.length, errors });
      toast.success(`Generated ${events.length} scheduled sessions`);
      onImported();
    } catch (err) {
      toast.error(err.message || "Failed to import schedule");
    } finally { setImporting(false); }
  };

  const handleClose = () => { setFile(null); setGridRows([]); setResults(null); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Weekly Training Schedule</DialogTitle>
          <DialogDescription>Upload a spreadsheet of weekly recurring field slots — one row per field/day/time combo — and it will generate scheduled sessions for each week of the season.</DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "csv" ? "default" : "outline"}
                onClick={() => setMode("csv")}
                className="w-full"
                size="sm"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV Upload
              </Button>
              <Button
                variant={mode === "grid" ? "default" : "outline"}
                onClick={() => setMode("grid")}
                className="w-full"
                size="sm"
              >
                <Grid3x3 className="w-4 h-4 mr-2" /> Training Grid
              </Button>
            </div>

            {mode === "csv" ? (
              <>
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    <p className="text-sm font-semibold mb-1">Expected columns:</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{SCHEDULE_CSV_FIELDS.map((f) => f.label).join(", ")}</p>
                    <p className="text-xs text-slate-500 mt-1">Field names and Team names must match existing records exactly.</p>
                  </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={downloadTemplate} className="w-full"><Download className="w-4 h-4 mr-2" /> Download CSV Template</Button>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select File</Label>
                  <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0] || null)} disabled={importing} />
                  {file && <p className="text-sm text-slate-600">Selected: {file.name}</p>}
                </div>
              </>
            ) : (
              <TrainingGridInput onParsed={(rows) => setGridRows(rows)} />
            )}
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Season Start Date</Label><Input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} /></div>
              <div><Label className="text-xs">Weeks to Generate</Label><Input type="number" min="1" max="52" value={weeks} onChange={(e) => setWeeks(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Default Type</Label>
                <Select value={defaultEventType} onValueChange={setDefaultEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">Practice</SelectItem>
                    <SelectItem value="game">Game</SelectItem>
                    <SelectItem value="camp">Camp</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <Alert className={results.errors.length > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="font-semibold mb-1">Import Complete</p>
              <p className="text-sm">{results.created} sessions generated from {results.rows} schedule rows.</p>
              {results.errors.length > 0 && (
                <div className="mt-2 text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
                  {results.errors.map((e, i) => <p key={i} className="flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />{e}</p>)}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={importing}>Cancel</Button>
              <Button onClick={handleImport} disabled={(mode === "csv" ? !file : gridRows.length === 0) || importing} className="bg-emerald-600 hover:bg-emerald-700">
                {importing ? "Generating..." : "Generate Schedule"}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700">Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}