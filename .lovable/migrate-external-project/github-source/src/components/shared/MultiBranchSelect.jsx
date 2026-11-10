import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, X } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";

export default function MultiBranchSelect({ value = [], onValueChange, placeholder = "Select branches" }) {
  const [open, setOpen] = useState(false);
  const { effectiveClubId } = useTenant();

  const { data: appConfig } = useQuery({
    queryKey: ["appConfig", "available_branches", effectiveClubId],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: "available_branches", club_id: effectiveClubId || null });
      return configs[0] || { config_value: { branches: [] } };
    },
  });

  const branches = appConfig?.config_value?.branches || [];
  const selectedBranches = Array.isArray(value) ? value : [];

  const handleToggle = (branch) => {
    const newValue = selectedBranches.includes(branch)
      ? selectedBranches.filter(b => b !== branch)
      : [...selectedBranches, branch];
    onValueChange(newValue);
  };

  const handleRemove = (branch, e) => {
    e.stopPropagation();
    onValueChange(selectedBranches.filter(b => b !== branch));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between dark:bg-slate-800 dark:border-slate-700"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedBranches.length === 0 ? (
              <span className="text-slate-500 dark:text-slate-400">{placeholder}</span>
            ) : (
              selectedBranches.map(branch => (
                <Badge key={branch} variant="secondary" className="text-xs">
                  {branch}
                  <button
                    onClick={(e) => handleRemove(branch, e)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 dark:bg-slate-800" align="start">
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          {branches.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No branches configured
            </p>
          ) : (
            branches.map(branch => (
              <div key={branch} className="flex items-center space-x-2">
                <Checkbox
                  id={branch}
                  checked={selectedBranches.includes(branch)}
                  onCheckedChange={() => handleToggle(branch)}
                />
                <Label
                  htmlFor={branch}
                  className="flex-1 cursor-pointer text-sm dark:text-slate-300"
                >
                  {branch}
                </Label>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}