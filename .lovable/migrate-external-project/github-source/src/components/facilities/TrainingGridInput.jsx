import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileSpreadsheet, Link2, Loader2, Settings as SettingsIcon } from "lucide-react";
import { parseTrainingGrid } from "@/lib/trainingGridParser";
import { loadSettings, saveSettings } from "@/lib/trainingGridSettings";
import SettingsPanel from "@/components/training-grid/SettingsPanel";
import PreviewTable from "@/components/training-grid/PreviewTable";

/**
 * Input component for the Training Grid parser mode.
 * Parses an .xlsx file or public Google Sheet into schedule rows,
 * then calls onParsed with rows in the format expected by buildRecurringEvents.
 *
 * @param {function} onParsed - (rows: Array<{field,day,start_time,end_time,team,event_type,notes}>, warnings: string[]) => void
 */
export default function TrainingGridInput({ onParsed }) {
  const [settings, setSettings] = useState(loadSettings);
  const [records, setRecords] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const updateSettings = useCallback((next) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const recordsToRows = (recs) =>
    recs.map((r) => ({
      field: r[0],
      day: r[1],
      start_time: r[2],
      end_time: r[3],
      team: r[4],
      event_type: r[5],
      notes: r[6],
    }));

  const handleFile = useCallback(async (file) => {
    setLoading(true);
    setError("");
    setWarnings([]);
    setRecords([]);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const { records: recs, warnings: w } = parseTrainingGrid(buf, settings);
      setRecords(recs);
      setWarnings(w);
      onParsed(recordsToRows(recs), w);
    } catch (e) {
      setError(e.message || "Failed to parse file");
      onParsed([], []);
    } finally {
      setLoading(false);
    }
  }, [settings, onParsed]);

  const onFileInput = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleUrl = useCallback(async () => {
    if (!url.trim()) return;
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const exportUrl = match
      ? `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`
      : url.trim();

    setLoading(true);
    setError("");
    setWarnings([]);
    setRecords([]);
    setFileName("Google Sheet");
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      const { records: recs, warnings: w } = parseTrainingGrid(buf, settings);
      setRecords(recs);
      setWarnings(w);
      onParsed(recordsToRows(recs), w);
    } catch (e) {
      setError(e.message || "Failed to fetch Google Sheet. Make sure it's publicly shared.");
      onParsed([], []);
    } finally {
      setLoading(false);
    }
  }, [url, settings, onParsed]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Upload a weekly training grid spreadsheet (sheets named Monday–Friday, fields as columns, time blocks as rows).
        </p>
        <Button variant="ghost" size="sm" onClick={() => setShowSettings((s) => !s)}>
          <SettingsIcon className="w-3.5 h-3.5 mr-1" /> Settings
        </Button>
      </div>

      {showSettings && (
        <SettingsPanel settings={settings} onChange={updateSettings} />
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Upload .xlsx
          </Label>
          <Input type="file" accept=".xlsx,.xls" onChange={onFileInput} disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> Google Sheets Link
          </Label>
          <div className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && handleUrl()}
            />
            <Button size="sm" onClick={handleUrl} disabled={loading || !url.trim()}>
              Fetch
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
            <p className="font-semibold mb-1">{warnings.length} warning{warnings.length !== 1 ? "s" : ""}</p>
            <ul className="space-y-0.5 max-h-24 overflow-auto">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {records.length} session{records.length !== 1 ? "s" : ""} parsed from {fileName}
          </p>
          <div className="max-h-48 overflow-auto rounded-md border border-border">
            <PreviewTable records={records} />
          </div>
        </div>
      )}
    </div>
  );
}