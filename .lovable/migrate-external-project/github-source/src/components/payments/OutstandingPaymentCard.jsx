import React from "react";
import { AlertCircle, Clock } from "lucide-react";
import PayNowButton from "@/components/payments/PayNowButton";
import AutopaySetupButton from "@/components/payments/AutopaySetupButton";

/** Prominent card for a single outstanding balance, used at the top of
 *  FamilyAccount so families see what they owe before anything else. */
export default function OutstandingPaymentCard({ reg, child }) {
  const outstanding = (reg.amount_due || 0) - (reg.amount_paid || 0);
  const isPastDue = reg.payment_status === "past_due" || reg.next_installment_date < new Date().toISOString().slice(0, 10);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
        isPastDue ? "border-rose-200 bg-rose-50/60" : "border-amber-200 bg-amber-50/60"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isPastDue ? "bg-rose-500" : "bg-amber-500"}`} />
      <div className="flex-1 min-w-0 pl-2">
        <div className="flex items-center gap-2">
          {isPastDue ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <p className="font-semibold text-foreground truncate">
            {child ? `${child.first_name} ${child.last_name}` : "Player"}
          </p>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${isPastDue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
            {isPastDue ? "Past Due" : "Due"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{reg.program_title || "Program"}{reg.location_name ? ` · ${reg.location_name}` : ""}</p>
        {reg.installment_count > 0 && reg.next_installment_date && (
          <p className="text-xs text-muted-foreground mt-1">Next installment due {reg.next_installment_date} · ${reg.installment_amount || 0}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <p className="text-xl font-bold text-foreground">${outstanding.toLocaleString()}</p>
        <div className="flex items-center gap-2">
          {reg.installment_count > 0 && (
            <AutopaySetupButton
              registrationId={reg.id}
              enabled={reg.autopay_enabled}
              hasPaymentMethod={!!reg.autopay_payment_method_id}
            />
          )}
          <PayNowButton registrationId={reg.id} />
        </div>
      </div>
    </div>
  );
}