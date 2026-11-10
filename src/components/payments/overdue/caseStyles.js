// Shared presentation maps for the overdue-payment resolution queue.

export const STATUS_META = {
  open: { label: "Open", className: "bg-rose-50 text-rose-700 border-rose-200" },
  in_progress: { label: "In progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  written_off: { label: "Written off", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const BUCKET_META = {
  "0-30": { label: "0-30 days", className: "bg-slate-100 text-slate-600 border-slate-200" },
  "31-60": { label: "31-60 days", className: "bg-amber-50 text-amber-700 border-amber-200" },
  "61-90": { label: "61-90 days", className: "bg-orange-50 text-orange-700 border-orange-200" },
  "90+": { label: "90+ days", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const PRIORITY_META = {
  normal: { label: "Normal", className: "bg-slate-100 text-slate-600 border-slate-200" },
  high: { label: "High", className: "bg-amber-50 text-amber-700 border-amber-200" },
  critical: { label: "Critical", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const OUTCOME_OPTIONS = [
  { value: "payment_received", label: "Paid — money received" },
  { value: "payment_plan", label: "Payment plan agreed" },
  { value: "financial_aid", label: "Financial aid approved" },
  { value: "written_off", label: "Written off / waived" },
  { value: "corrected", label: "Charge was wrong — cancelled" },
  { value: "other", label: "Other" },
];

export const CONTACT_CHANNELS = [
  { value: "call", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "text", label: "Text message" },
  { value: "in_person", label: "In person" },
  { value: "letter", label: "Letter" },
  { value: "other", label: "Other" },
];

export const TIMELINE_LABELS = {
  detected: "Flagged as overdue",
  reminder_sent: "Reminder sent",
  payment_recorded: "Payment recorded",
  plan_arranged: "Payment plan arranged",
  contact_logged: "Contact logged",
  assigned: "Case assigned",
  reopened: "Reopened",
  closed: "Auto-closed",
  resolved: "Case closed",
};

export const money = (value) => `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export const formatDay = (value) => {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const formatStamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};