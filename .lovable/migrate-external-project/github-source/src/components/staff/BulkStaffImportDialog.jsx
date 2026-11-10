import React, { useState, useMemo, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, ClipboardPaste, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { STAFF_ROLE_OPTIONS } from "@/components/staff/StaffDialog";
import { base44 } from "@/api/base44Client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimal CSV line parser that respects quoted fields with embedded commas/quotes.
function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cells.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

// Detect the delimiter (tab or comma) from the first non-empty line.
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || "";
  if (firstLine.includes("\t")) return "\t";
  return ",";
}

// Normalize a role label or value to a valid role value.
function normalizeRole(raw, roleMap) {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (roleMap[v]) return v;
  const byLabel = roleMap.labelToValue[v];
  if (byLabel) return byLabel;
  return null;
}

function parseInput(text, defaultRole, roleMap) {
  if (!text.trim()) return [];
  const delim = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows = [];

  // Detect header
  const firstCells = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = firstCells.some((c) => c.includes("name") || c.includes("email") || c.includes("role"));
  const header = hasHeader ? firstCells : null;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Determine column indices from header, or default to [name, email, role?]
  let nameIdx = 0, emailIdx = 1, roleIdx = -1, phoneIdx = -1;
  if (header) {
    header.forEach((h, i) => {
      if (h.includes("email")) emailIdx = i;
      else if (h.includes("role")) roleIdx = i;
      else if (h.includes("phone")) phoneIdx = i;
      else if (h.includes("name") || h.includes("first") || h.includes("full")) nameIdx = i;
    });
  }

  for (const line of dataLines) {
    const cells = parseCsvLine(line);
    const full_name = (cells[nameIdx] || "").trim();
    const email = (cells[emailIdx] || "").trim();
    const roleRaw = roleIdx >= 0 ? (cells[roleIdx] || "").trim() : "";
    const phone = phoneIdx >= 0 ? (cells[phoneIdx] || "").trim() : "";
    const role = normalizeRole(roleRaw, roleMap) || defaultRole;
    rows.push({ full_name, email, role, phone });
  }
  return rows;
}

export default function BulkStaffImportDialog({ open, onOpenChange, clubId, onImported }) {
  const [rawText, setRawText] = useState("");
  const [defaultRole, setDefaultRole] = useState("coach");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef(null);

  const roleMap = useMemo(() => {
    const map = {};
    const labelToValue = {};
    STAFF_ROLE_OPTIONS.forEach((r) => {
      map[r.value] = r.label;
      labelToValue[r.label.toLowerCase()] = r.value;
    });
    map.labelToValue = labelToValue;
    return map;
  }, []);

  const parsed = useMemo(() => parseInput(rawText, defaultRole, roleMap), [rawText, defaultRole, roleMap]);
  const valid = parsed.filter((r) => r.email && EMAIL_RE.test(r.email) && r.full_name);
  const invalid = parsed.filter((r) => !r.email || !EMAIL_RE.test(r.email) || !r.full_name);

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setRawText(text);
  };

  const handleImport = async () => {
    if (valid.length === 0) return;
    setSubmitting(true);
    setResults(null);
    try {
      const invitees = valid.map((r) => ({
        email: r.email, role: r.role, full_name: r.full_name,
      }));
      const res = await base44.functions.invoke("inviteClubMember", {
        invitees, club_id: clubId,
      });
      const data = res.data || {};
      setResults({
        sent: data.sent || 0,
        failed: data.failed || 0,
        details: data.results || [],
      });
      if (data.sent > 0 && onImported) onImported();
    } catch (e) {
      const details = e.response?.data || {};
      setResults({
        sent: 0, failed: valid.length,
        details: [],
        error: details.error || e.message || "Failed to send invitations",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (open) => {
    if (!open) {
      setRawText("");
      setResults(null);
      setDefaultRole("coach");
    }
    onOpenChange(open);
  };

  const downloadTemplate = () => {
    const csv = "Name,Email,Role\nJane Smith,jane@example.com,coach\nMike Jones,mike@example.com,branch_director\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "staff_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Bulk Add Staff</DialogTitle>
        </DialogHeader>

        {results ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold">{results.sent}</p>
                  <p className="text-xs text-muted-foreground">Invitations sent</p>
                </div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{results.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
            {results.error && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
                {results.error}
              </div>
            )}
            {results.details?.filter((d) => !d.success).length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {results.details.filter((d) => !d.success).map((d, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{d.email || d.full_name}</td>
                        <td className="px-3 py-2 text-red-600 text-xs">{d.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-dashed border-border p-4 text-center hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}>
                <Upload className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Upload CSV</p>
                <p className="text-xs text-muted-foreground">Click to choose a file</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <ClipboardPaste className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Or paste below</p>
                <p className="text-xs text-muted-foreground">Tab or comma separated</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Default Role (applies when not in data)</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Paste staff data</Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={6}
                placeholder={"Name,Email,Role\nJane Smith,jane@example.com,coach\nMike Jones,mike@example.com,branch_director"}
                className="font-mono text-xs"
              />
            </div>

            {parsed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Preview: <Badge variant="secondary" className="ml-1">{valid.length} valid</Badge>
                    {invalid.length > 0 && <Badge variant="destructive" className="ml-1">{invalid.length} invalid</Badge>}
                  </p>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={downloadTemplate}>
                    Download template
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Email</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Role</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((r, i) => {
                        const ok = r.email && EMAIL_RE.test(r.email) && r.full_name;
                        return (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-1.5">{r.full_name || "—"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.email || "—"}</td>
                            <td className="px-3 py-1.5">{roleMap[r.role] || r.role}</td>
                            <td className="px-3 py-1.5">
                              {ok
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={submitting || valid.length === 0} className="bg-primary hover:bg-primary/90">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : `Send ${valid.length} Invitation${valid.length !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}