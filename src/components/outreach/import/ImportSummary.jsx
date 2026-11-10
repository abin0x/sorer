import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function ImportSummary({ totals, onReset }) {
  const line = `${totals.created} imported, ${totals.updated} duplicates updated, ${totals.invalid} invalid, ${totals.needs_review} need email verification`;
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-green-700 font-semibold"><CheckCircle className="w-5 h-5" /> Import complete</div>
        <p className="text-slate-900 font-medium">{line}</p>
        <p className="text-sm text-slate-500">
          {totals.segments_assigned} segment memberships assigned
          {totals.suppressed ? ` · ${totals.suppressed} skipped (suppressed)` : ""}
          {totals.duplicates_in_file ? ` · ${totals.duplicates_in_file} repeated rows in file ignored` : ""}.
          No one has been enrolled in a sequence.
        </p>
        <Button onClick={onReset}>Import another file</Button>
      </CardContent>
    </Card>
  );
}