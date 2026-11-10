import React from "react";
import { Eye, ArrowLeft } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import SystemClubSelector from "@/components/layout/SystemClubSelector";

/** Persistent strip shown to system owners while acting as a specific club. */
export default function ViewingAsBanner() {
  const { viewingTenant, club, clearTenant } = useTenant();
  if (!viewingTenant) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-primary text-primary-foreground text-sm shadow-sm">
      <Eye className="w-4 h-4 shrink-0" />
      <span className="flex-1 min-w-0 truncate">
        Viewing as <strong>{club?.name || "club"}</strong> — only this club's data is shown.
      </span>
      <div className="w-56 text-foreground"><SystemClubSelector /></div>
      <button
        type="button"
        onClick={clearTenant}
        className="inline-flex items-center gap-1 rounded-md bg-primary-foreground/15 hover:bg-primary-foreground/25 px-3 py-1.5 font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to console
      </button>
    </div>
  );
}
