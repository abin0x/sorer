import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ComplianceStatusBadge from "@/components/compliance/ComplianceStatusBadge";
import { asList, reqLabel, fmtDate } from "@/lib/compliance";

const ALL = "all";

export default function AuditHistoryTab({ data }) {
  const [user, setUser] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["complianceAudit", user?.club_id],
    enabled: !!user?.club_id,
    queryFn: async () => {
      const res = await base44.entities.ComplianceAuditLog.filter({ club_id: user.club_id }, { sort: "-changed_at", limit: 500 });
      return asList(res);
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  const rows = (logs || []).filter((l) => (status === ALL || l.new_status === status)
    && (!q || (l.coach_email || "").toLowerCase().includes(q.toLowerCase()) || (l.changed_by || "").toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input className="w-full sm:w-64" placeholder="Search coach or reviewer…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {["missing", "pending", "approved", "flagged", "expired", "expiring_soon"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Coach</TableHead><TableHead>Requirement</TableHead><TableHead>Season</TableHead>
            <TableHead>From</TableHead><TableHead>To</TableHead><TableHead>By</TableHead><TableHead>When</TableHead><TableHead>Notes</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-slate-500 py-8">No audit events yet.</TableCell></TableRow>}
            {rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.coach_email}</TableCell>
                <TableCell>{reqLabel(l.requirement_type)}</TableCell>
                <TableCell>{l.season_name || "—"}</TableCell>
                <TableCell>{l.old_status || "—"}</TableCell>
                <TableCell><ComplianceStatusBadge status={l.new_status} /></TableCell>
                <TableCell>{l.changed_by}</TableCell>
                <TableCell className="text-slate-500">{fmtDate(l.changed_at)}</TableCell>
                <TableCell className="text-slate-500 max-w-xs truncate">{l.notes || ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}