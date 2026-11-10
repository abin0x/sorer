import { base44 } from "@/api/base44Client";

/**
 * Facilities billing API.
 * billingApi  — the facilities manager's side (invoices, billing organizations, Stripe setup)
 * portalApi   — the outside organization's portal, plus card checkout (usable by managers too)
 */
export const billingApi = (payload) =>
  base44.functions.invoke("facility-billing", payload).then((res) => res.data);

export const portalApi = (payload) =>
  base44.functions.invoke("facility-invoice-portal", payload).then((res) => res.data);

export const money = (value, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(Number(value) || 0);

export const INVOICE_STATUS = {
  draft: { label: "Draft", className: "bg-status-warning-50 text-status-warning-700" },
  sent: { label: "Sent", className: "bg-status-info-50 text-status-info-700" },
  partially_paid: { label: "Partly paid", className: "bg-status-warning-50 text-status-warning-700" },
  paid: { label: "Paid", className: "bg-status-success-50 text-status-success-700" },
  overdue: { label: "Overdue", className: "bg-status-danger-50 text-status-danger-700" },
  void: { label: "Void", className: "bg-muted text-muted-foreground" },
};

export const PAYMENT_METHODS = ["cash", "check", "ach", "stripe", "other"];

/** Readable message from a failed function call. */
export const apiError = (error, fallback) =>
  error?.response?.data?.error || error?.message || fallback;