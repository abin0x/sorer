import React from "react";
import { ClipboardCheck } from "lucide-react";
import { useSearchParams } from "@/lib/router-compat";
import ExpensesPayablesTab from "@/components/payments/ExpensesPayablesTab";

/** Bills, expense approvals and staff pay for the selected club (?view=approvals|payables|staff|paid). */
export default function ExpenseApprovals() {
  const [params] = useSearchParams();
  const view = params.get("view") || "approvals";
  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-primary" /> Expenses & staff pay
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Approve club expenses, pay bills before they're late, and settle coach and staff pay.</p>
      </div>
      <ExpensesPayablesTab key={view} initialView={view} />
    </div>
  );
}
