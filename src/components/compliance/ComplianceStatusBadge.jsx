import React from "react";
import { Badge } from "@/components/ui/badge";
import { STATUS_META } from "@/lib/compliance";

export default function ComplianceStatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.missing;
  return <Badge className={`${meta.cls} border-0 hover:${meta.cls}`}>{meta.label}</Badge>;
}