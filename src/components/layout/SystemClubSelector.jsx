import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Building2 } from "lucide-react";

const CONSOLE = "__console__";

/**
 * Sidebar club selector for system users. Lists every tenant plus a
 * "System Console" option. Selecting a club switches the whole app to that
 * club's menu + dashboard (data scoped to its club_id); selecting System
 * Console returns to the cross-tenant admin console.
 */
export default function SystemClubSelector() {
  const { viewingTenant, viewingSlug, selectTenant, clearTenant } = useTenant();
  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ["sys-club-selector"],
    queryFn: () => base44.entities.Club.list("name", 200),
  });

  const current = viewingTenant && viewingSlug ? viewingSlug : CONSOLE;

  const onChange = (v) => {
    if (v === CONSOLE) clearTenant();
    else selectTenant(v);
  };

  return (
    <Select value={current} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className="w-full h-9 text-sm bg-white dark:bg-slate-800">
        <SelectValue placeholder={isLoading ? "Loading clubs…" : "Select a club…"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CONSOLE}>
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> System Console
          </span>
        </SelectItem>
        {clubs.map((c) => (
          <SelectItem key={c.id} value={c.slug}>
            <span className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> {c.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}