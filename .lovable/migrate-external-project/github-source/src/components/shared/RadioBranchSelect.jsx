import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";

export default function RadioBranchSelect({ value = [], onValueChange, required = false }) {
  const { effectiveClubId } = useTenant();
  const { data: config } = useQuery({
    queryKey: ["config", "available_branches", effectiveClubId],
    queryFn: () => base44.entities.AppConfig.filter({ config_key: "available_branches", club_id: effectiveClubId || null }),
  });

  const branches = (config?.[0]?.config_value?.branches || []).sort();

  const toggleBranch = (branch) => {
    const newValue = value.includes(branch)
      ? value.filter((b) => b !== branch)
      : [...value, branch];
    onValueChange(newValue);
  };

  const selectAll = () => {
    onValueChange(branches);
  };

  const deselectAll = () => {
    onValueChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={selectAll}
          className="hover:bg-emerald-50 hover:border-emerald-600 hover:scale-105 transition-all"
        >
          Select All
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={deselectAll}
          className="hover:bg-slate-100 hover:scale-105 transition-all"
        >
          Clear All
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {branches.map((branch) => (
          <div
            key={branch}
            onClick={() => toggleBranch(branch)}
            className={`
              flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
              ${
                value.includes(branch)
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950 shadow-md"
                  : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700"
              }
            `}
          >
            <div
              className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                ${
                  value.includes(branch)
                    ? "border-emerald-600 bg-emerald-600"
                    : "border-slate-300"
                }
              `}
            >
              {value.includes(branch) && (
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              )}
            </div>
            <span className={`font-medium text-sm ${value.includes(branch) ? "text-emerald-900 dark:text-emerald-100" : "text-slate-700 dark:text-slate-300"}`}>
              {branch}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}