import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ComplianceStatusBadge from "@/components/compliance/ComplianceStatusBadge";
import { BODIES, REQUIREMENTS, fmtDate, isCompliant } from "@/lib/compliance";

const ALL = "all";

function overall(recs) {
  if (recs.some((r) => r?.status === "flagged")) return "Flagged";
  if (recs.every(isCompliant)) return "Complete";
  if (recs.some((r) => r?.status === "pending")) return "Pending";
  return "Incomplete";
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function OverviewTab({ data }) {
  const { coaches, records, branches, settings } = data;
  const [branch, setBranch] = useState(ALL);
  const [body, setBody] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [reqType, setReqType] = useState(ALL);

  const rows = useMemo(() => coaches.map((c) => {
    const find = (type) => records.find((r) => r.coach_email?.toLowerCase() === c.email.toLowerCase() && r.requirement_type === type);
    const bg = find("background_check");
    const ss = find("safesport_certification");
    const scope = reqType === ALL ? [bg, ss] : [reqType === "background_check" ? bg : ss];
    const updated = [bg, ss].map((r) => r?.updated_date).filter(Boolean).sort().pop();
    return { c, bg, ss, overall: overall(scope), updated };
  }).filter((r) => (branch === ALL || r.c.location_id === branch)
    && (body === ALL || [r.bg, r.ss].some((x) => x?.governing_bodies?.includes(body) || x?.governing_body === body))
    && (status === ALL || r.overall === status)), [coaches, records, branch, body, status, reqType]);

  const bodyOpts = BODIES.filter((b) => settings?.governing_bodies?.includes(b.key));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterSelect value={branch} onChange={setBranch} placeholder="All branches" options={branches.map((b) => ({ key: b.id, label: b.name }))} />
        <FilterSelect value={body} onChange={setBody} placeholder="All governing bodies" options={bodyOpts} />
        <FilterSelect value={status} onChange={setStatus} placeholder="All statuses" options={["Complete", "Incomplete", "Pending", "Flagged"].map((s) => ({ key: s, label: s }))} />
        <FilterSelect value={reqType} onChange={setReqType} placeholder="All requirements" options={REQUIREMENTS} />
      </div>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Coach</TableHead><TableHead>Branch</TableHead><TableHead>Background Check</TableHead>
            <TableHead>SafeSport</TableHead><TableHead>Overall</TableHead><TableHead>Last Updated</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No coaches match these filters.</TableCell></TableRow>}
            {rows.map(({ c, bg, ss, overall: o, updated }) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                <TableCell>{c.location_name || "—"}</TableCell>
                <TableCell><ComplianceStatusBadge status={bg?.status || "missing"} /></TableCell>
                <TableCell><ComplianceStatusBadge status={ss?.status || "missing"} /></TableCell>
                <TableCell className="font-medium">{o}</TableCell>
                <TableCell className="text-slate-500">{fmtDate(updated)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}