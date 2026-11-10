import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ComplianceStatusBadge from "@/components/compliance/ComplianceStatusBadge";
import { reqLabel, fmtDate } from "@/lib/compliance";

export default function RequirementCard({ requirement, record, onUpload }) {
  const status = record?.status || "missing";
  const pending = status === "pending";
  const canAct = ["missing", "flagged", "expired", "expiring_soon"].includes(status);
  const actionLabel = status === "flagged" ? "Action Required" : status === "missing" ? "Upload now" : "Renew";
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{reqLabel(requirement)}</h3>
          <ComplianceStatusBadge status={status} />
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-slate-500">Completed</dt><dd>{fmtDate(record?.completion_date)}</dd></div>
          <div><dt className="text-slate-500">Expires</dt><dd>{fmtDate(record?.expiration_date)}</dd></div>
        </dl>
        {pending && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">Your document is under review. You will be notified once an admin approves it. Do not upload another certificate.</p>}
        {status === "flagged" && <p className="text-sm text-orange-800 bg-orange-50 rounded-lg p-3">{record.admin_notes}</p>}
        {status !== "approved" && (
          <Button className="w-full" variant={status === "flagged" ? "default" : "outline"} disabled={!canAct} onClick={() => onUpload(requirement)}>
            {pending ? "Under review" : actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}