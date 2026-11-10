import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight } from "lucide-react";

const FIELD_OPTIONS = [
  { value: "team_name", label: "Team Name *" },
  { value: "team_contact_name", label: "Contact Name" },
  { value: "team_contact_email", label: "Contact Email *" },
  { value: "team_contact_phone", label: "Contact Phone" },
  { value: "coach_name", label: "Head Coach Name" },
  { value: "team_city", label: "City" },
  { value: "team_state", label: "State" },
  { value: "age_group", label: "Age Group" },
  { value: "gender", label: "Gender" },
  { value: "division", label: "Division" },
  { value: "roster_count", label: "Roster Count" },
  { value: "notes", label: "Notes" },
  { value: "_skip", label: "— Skip this column —" },
];

const AUTO_MAP = {
  team: "team_name", "team name": "team_name", name: "team_name",
  contact: "team_contact_name", "contact name": "team_contact_name", coach: "team_contact_name",
  email: "team_contact_email", "contact email": "team_contact_email", "e-mail": "team_contact_email",
  phone: "team_contact_phone", "contact phone": "team_contact_phone", tel: "team_contact_phone",
  "coach": "coach_name", "coach name": "coach_name", "head coach": "coach_name", "head coach name": "coach_name",
  city: "team_city",
  state: "team_state", st: "team_state",
  "age group": "age_group", "age": "age_group", "age_group": "age_group",
  gender: "gender", division: "division",
  roster: "roster_count", "roster count": "roster_count", "roster size": "roster_count", players: "roster_count",
  notes: "notes", note: "notes", comments: "notes",
};

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export default function TournamentCsvImport({ tournament, onClose, onImported }) {
  const [step, setStep] = useState(1); // 1=upload, 2=map, 3=preview, 4=done
  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({});
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleFile = (file) => {
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        setError("Could not parse CSV. Make sure the file has a header row.");
        return;
      }
      setCsvData(parsed);
      // Auto-map columns
      const auto = {};
      parsed.headers.forEach((h) => {
        const key = h.toLowerCase().trim();
        auto[h] = AUTO_MAP[key] || "_skip";
      });
      setMapping(auto);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const mappedRows = csvData.rows.map((row) => {
    const obj = {};
    csvData.headers.forEach((h, i) => {
      const field = mapping[h];
      if (field && field !== "_skip") {
        obj[field] = row[i] || "";
      }
    });
    return obj;
  });

  const validRows = mappedRows.filter((r) => r.team_name && r.team_contact_email);
  const invalidRows = mappedRows.filter((r) => !r.team_name || !r.team_contact_email);

  const handleCommit = async () => {
    setCommitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("tournament-csv-commit", {
        tournament_id: tournament.id,
        teams: mappedRows,
      });
      setResult(res.data);
      setStep(4);
      if (onImported) onImported();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Import failed.");
    } finally {
      setCommitting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ["Team Name", "Contact Name", "Contact Email", "Contact Phone", "Head Coach Name", "City", "State", "Age Group", "Gender", "Division", "Roster Count", "Notes"];
    const example = ["Liverpool FC", "John Smith", "john@liverpoolfc.com", "555-0100", "Coach Mike", "Liverpool", "OH", "U14", "Boys", "Division A", "18", "Travel team"];
    const csv = [headers.join(","), example.map((v) => `"${v}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tournament_teams_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Teams via CSV — {tournament?.name}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {["Upload", "Map Columns", "Preview", "Done"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-slate-200 text-slate-500"}`}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${step >= i + 1 ? "font-medium" : "text-slate-400"}`}>{label}</span>
              {i < 3 && <ArrowRight className="w-3 h-3 text-slate-300" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-primary/40 transition cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="font-medium text-slate-700 mb-1">Click to upload a CSV file</p>
              <p className="text-sm text-slate-500">File should have a header row with column names</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
              />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Download Template
              </Button>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Map your CSV columns to the tournament registration fields. Required fields: Team Name and Contact Email.</p>
            <div className="space-y-2">
              {csvData.headers.map((header) => (
                <div key={header} className="flex items-center gap-3 p-2 border rounded-lg">
                  <div className="flex-1">
                    <Badge variant="outline" className="text-xs">{header}</Badge>
                    <span className="text-xs text-slate-400 ml-2">e.g. "{csvData.rows[0]?.[csvData.headers.indexOf(header)] || ""}"</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                  <Select value={mapping[header] || "_skip"} onValueChange={(v) => setMapping({ ...mapping, [header]: v })}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Preview Data</Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge className="bg-emerald-100 text-emerald-700">{validRows.length} valid</Badge>
              {invalidRows.length > 0 && <Badge className="bg-red-100 text-red-700">{invalidRows.length} invalid (missing required fields)</Badge>}
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-slate-500">#</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-500">Team Name</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-500">Contact Email</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-500">Contact Name</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-500">Coach</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-500">City</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-500">Roster</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.map((row, i) => {
                    const valid = row.team_name && row.team_contact_email;
                    return (
                      <tr key={i} className={`border-b last:border-0 ${!valid ? "bg-red-50" : ""}`}>
                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{row.team_name || <span className="text-red-500">—</span>}</td>
                        <td className="px-3 py-2">{row.team_contact_email || <span className="text-red-500">—</span>}</td>
                        <td className="px-3 py-2 text-slate-600">{row.team_contact_name || ""}</td>
                        <td className="px-3 py-2 text-slate-600">{row.coach_name || ""}</td>
                        <td className="px-3 py-2 text-slate-600">{row.team_city || ""}</td>
                        <td className="px-3 py-2 text-slate-600">{row.roster_count || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleCommit} disabled={committing || validRows.length === 0}>
                {committing ? "Importing..." : `Import ${validRows.length} Team${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && result && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-semibold">Import Complete</h3>
            <p className="text-slate-600">{result.imported} team{result.imported !== 1 ? "s" : ""} imported successfully.</p>
            {result.errors && result.errors.length > 0 && (
              <div className="text-left p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <p className="font-medium mb-1">{result.errors.length} row(s) skipped:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  {result.errors.length > 5 && <li>...and {result.errors.length - 5} more</li>}
                </ul>
              </div>
            )}
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}