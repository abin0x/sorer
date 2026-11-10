import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ComplianceStatusBadge from "@/components/compliance/ComplianceStatusBadge";
import { reqLabel, fmtDate } from "@/lib/compliance";

export default function ComplianceHistory({ records }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Compliance History</CardTitle></CardHeader>
      <CardContent>
        {records.length === 0 ? <p className="text-sm text-slate-500">No past seasons yet.</p> : (
          <ul className="divide-y">
            {records.map((r) => (
              <li key={r.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div><span className="font-medium">{r.season_name}</span> · {reqLabel(r.requirement_type)}</div>
                <div className="flex items-center gap-3 text-slate-500">
                  <span>{fmtDate(r.completion_date)} → {fmtDate(r.expiration_date)}</span>
                  <ComplianceStatusBadge status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}