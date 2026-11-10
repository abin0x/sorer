import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Parses a CSV string into rows. Handles quoted fields and commas inside quotes.
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim(); });
    return obj;
  }).filter((r) => r.first_name || r.last_name || r.email);
}

function parseRow(line) {
  const cells = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { cells.push(cur); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

export default function ComplianceCsvImportDialog({ open, onOpenChange, clubId }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const parsed = parseCSV(text);
    setRows(parsed);
    if (parsed.length === 0) toast.error("No data rows found in CSV");
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("compliance-csv-import", { club_id: clubId, rows });
      setResult(res.data);
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(`Imported: ${res.data.matched} matched, ${res.data.records_created} created, ${res.data.records_updated} updated`);
        qc.invalidateQueries({ queryKey: ["coachCompliance"] });
        qc.invalidateQueries({ queryKey: ["adminCompliance"] });
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Import failed");
    }
    setLoading(false);
  };

  const reset = () => { setRows([]); setFileName(""); setResult(null); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />Import Compliance CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            {fileName ? (
              <p className="text-sm font-medium text-slate-700">{fileName} — {rows.length} rows</p>
            ) : (
              <p className="text-sm text-slate-500">Click to select a CSV file from GotSport or other system</p>
            )}
            <Button variant="outline" size="sm" className="mt-3" onClick={() => fileRef.current?.click()}>
              Choose File
            </Button>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            <p className="font-semibold mb-1">Expected columns (header row):</p>
            <p>first_name, last_name, email, background_check_date, safesport_date, background_check_expiration, safesport_expiration, background_check_status, safesport_status</p>
            <p className="mt-1">Coaches are matched by email or first+last name. Missing columns are skipped.</p>
          </div>

          {result && (
            <div className="rounded-lg border p-4 space-y-2">
              {result.error ? (
                <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{result.error}</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Import complete</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>Matched: <b>{result.matched}</b></p>
                    <p>Unmatched: <b>{result.unmatched}</b></p>
                    <p>Records created: <b>{result.records_created}</b></p>
                    <p>Records updated: <b>{result.records_updated}</b></p>
                  </div>
                  {result.unmatched_sample?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Unmatched rows (first 20):</p>
                      <div className="max-h-32 overflow-y-auto text-xs space-y-0.5">
                        {result.unmatched_sample.map((r, i) => (
                          <p key={i} className="text-slate-600">{r.first_name} {r.last_name} {r.email ? `(${r.email})` : ""} — {r.reason}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleImport} disabled={!rows.length || loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Import {rows.length} Rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}