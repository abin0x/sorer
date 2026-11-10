import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import { IMPORT_FIELDS, parseCsv, autoMap, buildRecords, localStatus } from "@/lib/outreachCsv";
import ImportPreviewTable from "./ImportPreviewTable";
import ImportSummary from "./ImportSummary";
import NeedsReviewList from "./NeedsReviewList";

const EMPTY = { created: 0, updated: 0, invalid: 0, suppressed: 0, duplicates_in_file: 0, needs_review: 0, segments_assigned: 0 };
const NONE = "__none__";

export default function OutreachImport() {
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [server, setServer] = useState({ existing: [], suppressed: [] });
  const [importing, setImporting] = useState(false);
  const [totals, setTotals] = useState(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const records = useMemo(() => (parsed ? buildRecords(parsed.rows, mapping) : []), [parsed, mapping]);

  const emailKey = records.map((r) => (r.email || "").toLowerCase()).join("|");
  useEffect(() => {
    if (!records.length) return;
    const emails = records.map((r) => r.email).filter(Boolean);
    base44.functions.invoke("outreach-import", { action: "preview", emails })
      .then((res) => setServer(res.data))
      .catch(() => setServer({ existing: [], suppressed: [] }));
  }, [emailKey]);

  const statuses = useMemo(() => {
    const existing = new Set(server.existing.map((e) => e.toLowerCase()));
    const suppressed = new Set(server.suppressed.map((e) => e.toLowerCase()));
    const seen = new Set();
    return records.map((r) => {
      const s = localStatus(r);
      if (s !== "Ready") return s;
      const e = r.email.toLowerCase();
      if (suppressed.has(e)) return "Suppressed";
      if (existing.has(e) || seen.has(e)) return "Duplicate";
      seen.add(e);
      return "Ready";
    });
  }, [records, server]);

  const counts = statuses.reduce((a, s) => ({ ...a, [s]: (a[s] || 0) + 1 }), {});
  const importable = records.filter((_, i) => ["Ready", "Duplicate"].includes(statuses[i]));
  const missingRequired = IMPORT_FIELDS.filter((f) => f.required && !Object.values(mapping).includes(f.key));

  const onFile = async (file) => {
    if (!file) return;
    setError("");
    const p = parseCsv(await file.text());
    if (!p.headers.length || !p.rows.length) { setError("That file has no data rows."); return; }
    setParsed(p);
    setMapping(autoMap(p.headers));
    setServer({ existing: [], suppressed: [] });
  };

  const reset = () => { setParsed(null); setTotals(null); setError(""); };

  const confirm = async () => {
    setImporting(true);
    setError("");
    const sum = { ...EMPTY, invalid: (counts["Invalid email"] || 0) + (counts["Missing required field"] || 0) };
    try {
      for (let i = 0; i < importable.length; i += 50) {
        const res = await base44.functions.invoke("outreach-import", { action: "commit", records: importable.slice(i, i + 50) });
        Object.keys(EMPTY).forEach((k) => { sum[k] += res.data[k] || 0; });
      }
      sum.invalid -= 0;
      setTotals(sum);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setImporting(false); }
  };

  if (totals) return (<div className="space-y-4"><ImportSummary totals={totals} onReset={reset} /><NeedsReviewList refreshKey={refreshKey} /></div>);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Import prospects from CSV</h3>
          <p className="text-sm text-slate-500">Required: first_name, last_name, email, club_name. Optional: title, branch_count, player_count, registration_platform, region, pain_signal, club_website, linkedin_url.</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-300 cursor-pointer text-sm font-medium hover:bg-slate-50">
            <Upload className="w-4 h-4" /> {parsed ? "Choose a different file" : "Choose CSV file"}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {parsed && (
        <>
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold text-slate-900">Map columns</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {parsed.headers.map((h, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-xs font-medium text-slate-600 truncate">{h || `Column ${i + 1}`}</p>
                    <Select value={mapping[i] || NONE} onValueChange={(v) => setMapping({ ...mapping, [i]: v === NONE ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Ignore column</SelectItem>
                        {IMPORT_FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {missingRequired.length > 0 && <p className="text-sm text-red-600">Map required fields: {missingRequired.map((f) => f.label).join(", ")}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap gap-3 text-sm">
                {["Ready", "Duplicate", "Suppressed", "Invalid email", "Missing required field"].map((s) => (
                  <span key={s} className="text-slate-600"><b>{counts[s] || 0}</b> {s}</span>
                ))}
              </div>
              <ImportPreviewTable records={records} statuses={statuses} />
              <p className="text-xs text-slate-500">Duplicates update the existing prospect. Suppressed, invalid and incomplete rows are skipped.</p>
              <Button onClick={confirm} disabled={importing || missingRequired.length > 0 || importable.length === 0} className="gap-2">
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                {importing ? "Importing…" : `Import ${importable.length} prospects`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      <NeedsReviewList refreshKey={refreshKey} />
    </div>
  );
}