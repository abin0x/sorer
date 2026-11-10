import React from "react";
import { ShieldCheck, ShieldAlert, Clock, UserX } from "lucide-react";
import { coachStatus } from "@/components/compliance/useCoachCompliance";

const META = {
  compliant: { icon: ShieldCheck, cls: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Compliant" },
  pending: { icon: Clock, cls: "text-amber-600 bg-amber-50 border-amber-200", label: "Pending" },
  flagged: { icon: ShieldAlert, cls: "text-orange-600 bg-orange-50 border-orange-200", label: "Flagged" },
  incomplete: { icon: UserX, cls: "text-red-600 bg-red-50 border-red-200", label: "Not compliant" },
  unassigned: { icon: UserX, cls: "text-slate-400 bg-slate-50 border-slate-200", label: "No coach" },
};

export default function CoachComplianceBadge({ coaches, byEmail, compact }) {
  const emails = (coaches || []).map((c) => c.email).filter(Boolean);
  const status = coachStatus(emails, byEmail);
  const m = META[status] || META.unassigned;
  const Icon = m.icon;
  if (compact) return <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${m.cls}`} title={m.label}><Icon className="w-3 h-3" />{m.label}</span>;
  return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${m.cls}`}><Icon className="w-3 h-3" />{m.label}</span>;
}