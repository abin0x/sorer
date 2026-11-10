import React from "react";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS = {
  trialing: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  past_due: "bg-rose-100 text-rose-700",
  suspended: "bg-slate-200 text-slate-700",
  canceled: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-400",
};

export default function TenantRow({ club, branchCount, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${
        active ? "border-emerald-400 bg-emerald-50/60" : "border-transparent hover:bg-slate-50"
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
        {club.logo_url ? (
          <img src={club.logo_url} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <Building2 className="w-4 h-4 text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{club.name}</p>
        <p className="text-xs text-slate-700 truncate">{club.slug || "no-slug"} · {branchCount ?? 0} branch{branchCount === 1 ? "" : "es"}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full border border-white shadow" style={{ background: club.primary_color || "#399F7D" }} />
        <span className="w-2.5 h-2.5 rounded-full border border-white shadow" style={{ background: club.secondary_color || "#F59E0B" }} />
      </div>
      <Badge className={`${STATUS_COLORS[club.status] || "bg-slate-100"} shrink-0`}>{club.status}</Badge>
    </button>
  );
}