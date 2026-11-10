import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Receipt } from "lucide-react";
import { billingApi, money } from "@/lib/facilityBillingApi";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import InvoiceDetailDialog from "./InvoiceDetailDialog";

const FILTERS = [
  { value: "all", label: "All invoices" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partly paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

function Tile({ label, value, tone }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold mt-1 ${tone || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function InvoicesTab() {
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["facility-billing"],
    queryFn: () => billingApi({ action: "overview" }),
  });

  const invoices = data?.invoices || [];
  const totals = data?.totals || { draft: 0, outstanding: 0, collected: 0 };
  const shown = status === "all" ? invoices : invoices.filter((i) => i.status === status);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tile label="Draft — not sent yet" value={money(totals.draft)} tone="text-status-warning-700" />
        <Tile label="Outstanding" value={money(totals.outstanding)} />
        <Tile label="Collected to date" value={money(totals.collected)} tone="text-status-success-700" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Draft invoices are created automatically on the 1st for the previous month's outside bookings, then emailed to
          each organization every Monday until they are paid.
        </p>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Receipt className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              No invoices here yet. Mark a field booking as an outside rental and it will be billed on the 1st.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {shown.map((invoice) => (
              <button
                key={invoice.id}
                type="button"
                onClick={() => setOpenId(invoice.id)}
                className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {invoice.billing_entity_name} · {invoice.invoice_number}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {invoice.period_label || "—"} · {invoice.booking_count || 0} bookings · due {invoice.due_date || "—"}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="font-semibold">{money(invoice.total, invoice.currency)}</p>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <InvoiceDetailDialog
        open={!!openId}
        onOpenChange={(open) => !open && setOpenId(null)}
        invoiceId={openId}
        onChanged={refetch}
      />
    </div>
  );
}