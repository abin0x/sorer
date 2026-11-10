import React, { useMemo } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ComplianceStatusBadge from "@/components/compliance/ComplianceStatusBadge";
import { REQUIREMENTS, fmtDate, reqLabel } from "@/lib/compliance";

const ISSUE = { missing: "Missing", expired: "Expired", expiring_soon: "Expires within 30 days", flagged: "Flagged, awaiting resubmission" };

export default function MissingReportTab({ data }) {
  const rows = useMemo(() => data.coaches.flatMap((c) => REQUIREMENTS.map((req) => {
    const rec = data.records.find((r) => r.coach_email?.toLowerCase() === c.email.toLowerCase() && r.requirement_type === req.key);
    const status = rec?.status || "missing";
    return ISSUE[status] ? { c, req: req.key, status, issue: ISSUE[status], exp: rec?.expiration_date } : null;
  })).filter(Boolean), [data]);

  const exportCsv = () => {
    const lines = [["Coach", "Email", "Branch", "Requirement", "Issue", "Expiration"], ...rows.map((r) => [`${r.c.first_name} ${r.c.last_name}`, r.c.email, r.c.location_name || "", reqLabel(r.req), r.issue, r.exp || ""])];
    const csv = lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `compliance-missing-expired-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="w-4 h-4" />Export CSV</Button></div>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Coach</TableHead><TableHead>Branch</TableHead><TableHead>Requirement</TableHead><TableHead>Status</TableHead><TableHead>Issue</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">Every coach is compliant.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={`${r.c.id}-${r.req}`}>
                <TableCell className="font-medium">{r.c.first_name} {r.c.last_name}</TableCell>
                <TableCell>{r.c.location_name || "—"}</TableCell>
                <TableCell>{reqLabel(r.req)}</TableCell>
                <TableCell><ComplianceStatusBadge status={r.status} /></TableCell>
                <TableCell>{r.issue}</TableCell>
                <TableCell>{fmtDate(r.exp)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}