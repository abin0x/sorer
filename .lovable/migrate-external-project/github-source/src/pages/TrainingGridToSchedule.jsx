import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Download, FileSpreadsheet, Link2, Loader2 } from "lucide-react";
import { parseTrainingGrid, recordsToCsv, CSV_HEADERS } from "@/lib/trainingGridParser";
import { loadSettings, saveSettings } from "@/lib/trainingGridSettings";
import SettingsPanel from "@/components/training-grid/SettingsPanel";
import PreviewTable from "@/components/training-grid/PreviewTable";

export default function TrainingGridToSchedule() {
  const [settings, setSettings] = useState(loadSettings);
  const [records, setRecords] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const updateSettings = useCallback((next) => {
    setSettings(next);
    saveSettings(next);
  }, []);

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
    } catch (e) {
      setError(e.message || "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }, [settings]);

  const onFileInput = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleUrl = useCallback(async () => {
    if (!url.trim()) return;
    // Convert Google Sheets edit URL to xlsx export URL
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
    } catch (e) {
      setError(e.message || "Failed to fetch Google Sheet. Make sure it's publicly shared.");
    } finally {
      setLoading(false);
    }
  }, [url, settings]);

  const downloadCsv = () => {
    const csv = recordsToCsv(records);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "weekly_schedule.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Training Grid to Schedule CSV</h1>
          <p className="text-sm text-muted-foreground">Upload a weekly training grid .xlsx or paste a public Google Sheets link. Parsing is deterministic — no AI.</p>
        </div>
        <SettingsPanel settings={settings} onChange={updateSettings} />
      </div>

      {/* Input section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* File upload */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Upload .xlsx File
              </Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileInput}
                disabled={loading}
              />
            </div>

            {/* Google Sheets URL */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Google Sheets Link
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
                <Button onClick={handleUrl} disabled={loading || !url.trim()}>
                  Fetch
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {warnings.length} Warning{warnings.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 max-h-40 overflow-auto">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && (records.length > 0 || fileName) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                Preview {fileName && <span className="text-muted-foreground font-normal">— {fileName}</span>}
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{records.length} row{records.length !== 1 ? "s" : ""}</span>
                <Button onClick={downloadCsv} disabled={!records.length} size="sm">
                  <Download className="w-4 h-4 mr-2" /> Download CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PreviewTable records={records} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}