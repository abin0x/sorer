import React from "react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/expenseHelpers";

export default function ExpenseStatusBadge({ status }) {
  return (
    <Badge variant="outline" className={`text-[11px] font-semibold ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}