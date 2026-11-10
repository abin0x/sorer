import React from "react";
import { INVOICE_STATUS } from "@/lib/facilityBillingApi";

export default function InvoiceStatusBadge({ status }) {
  const meta = INVOICE_STATUS[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}