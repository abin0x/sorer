import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ReviewDialog from "@/components/compliance/ReviewDialog";
import { fmtDate, reqLabel } from "@/lib/compliance";

export default function PendingQueueTab({ data }) {
  const qc = useQueryClient();
  const [active, setActive] = useState(null);
  const pending = data.records.filter((r) => r.status === "pending").sort((a, b) => (a.submitted_at || "").localeCompare(b.submitted_at || ""));
  return (
    <>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Coach</TableHead><TableHead>Requirement</TableHead><TableHead>Completion</TableHead><TableHead>Submitted</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {pending.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">Nothing waiting for review.</TableCell></TableRow>}
            {pending.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.coach_name}</TableCell>
                <TableCell>{reqLabel(r.requirement_type)}</TableCell>
                <TableCell>{fmtDate(r.completion_date)}</TableCell>
                <TableCell>{fmtDate(r.submitted_at)}</TableCell>
                <TableCell className="text-right"><Button size="sm" onClick={() => setActive(r)}>Review</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {active && <ReviewDialog record={active} onClose={() => setActive(null)} onDone={() => { setActive(null); qc.invalidateQueries({ queryKey: ["adminCompliance"] }); }} />}
    </>
  );
}