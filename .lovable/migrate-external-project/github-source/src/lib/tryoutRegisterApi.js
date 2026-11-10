import { base44 } from "@/api/base44Client";

/** Thin wrapper over the tryout-registration function: every eligibility,
 *  capacity and price decision is made server-side and only read here. */
const invoke = async (action, payload = {}) => {
  const res = await base44.functions.invoke("tryout-registration", { action, ...payload });
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
};

export const loadFamily = (clubId, email) => invoke("family", { club_id: clubId, email });
export const addChild = (payload) => invoke("add_child", payload);
export const checkPromo = (clubId, code, subtotal) => invoke("promo", { club_id: clubId, code, subtotal });
export const startCheckout = (payload) => invoke("checkout", payload);
export const loadStatus = (payload) => invoke("status", payload);
export const rescheduleRegistration = (payload) => invoke("reschedule", payload);
export const cancelRegistration = (payload) => invoke("cancel", payload);
export const requestFinancialAid = (payload) => invoke("financial_aid", payload);

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export const SESSION_LABEL = {
  main_tryout: "Main Club Tryout",
  open_training: "Open Training",
  supplemental_tryout: "Supplemental Tryout",
};

export const REG_STATUS = {
  pooled: { label: "In the pool", className: "bg-slate-100 text-slate-700" },
  pending_payment: { label: "Awaiting payment", className: "bg-amber-100 text-amber-700" },
  registered: { label: "Registered", className: "bg-emerald-100 text-emerald-700" },
  waitlist: { label: "Waitlist", className: "bg-amber-100 text-amber-700" },
  checked_in: { label: "Checked in", className: "bg-emerald-100 text-emerald-700" },
  no_show: { label: "No show", className: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelled", className: "bg-rose-100 text-rose-700" },
};

export const PAYMENT_STATUS = {
  unpaid: { label: "Payment due", className: "bg-rose-100 text-rose-700" },
  pending: { label: "Payment pending", className: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
  partially_paid: { label: "Partly paid", className: "bg-amber-100 text-amber-700" },
  waived: { label: "Fee waived", className: "bg-sky-100 text-sky-700" },
  financial_aid_pending: { label: "Aid requested", className: "bg-indigo-100 text-indigo-700" },
  refunded: { label: "Refunded", className: "bg-slate-100 text-slate-700" },
  failed: { label: "Payment failed", className: "bg-rose-100 text-rose-700" },
};

export const WAIVER_STATUS = {
  signed: { label: "Waivers signed", className: "bg-emerald-100 text-emerald-700" },
  not_started: { label: "Paperwork outstanding", className: "bg-amber-100 text-amber-700" },
};

export const statusMeta = (map, key) => map[key] || { label: key || "—", className: "bg-slate-100 text-slate-700" };