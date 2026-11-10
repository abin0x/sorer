import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const toneClasses = {
  sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900 dark:text-sky-300 dark:border-sky-800",
  violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-300 dark:border-violet-800",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-800",
  slate: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

/**
 * Compact inline RACI staff picker for table cells.
 * Shows assigned staff names as removable badges with a + dropdown to add more.
 * value is an array of staff emails; onValueChange returns the new array.
 */
export default function RaciStaffCell({ value = [], onValueChange, tone = "sky", canEdit = true }) {
  const [open, setOpen] = useState(false);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const list = Array.isArray(value) ? value : value ? [value] : [];
  const selected = teamMembers.filter((m) => list.includes(m.email));

  const toggle = (email) => {
    if (list.includes(email)) onValueChange(list.filter((e) => e !== email));
    else onValueChange([...list, email]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 min-w-[140px] py-1">
      {selected.map((m) => (
        <Badge key={m.email} variant="outline" className={cn("text-[10px] gap-1 pr-0.5", toneClasses[tone] || toneClasses.sky)}>
          <span className="truncate max-w-[90px]">{m.full_name || m.email.split("@")[0]}</span>
          {canEdit && (
            <button
              type="button"
              onClick={() => toggle(m.email)}
              className="rounded-full hover:bg-black/10 p-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </Badge>
      ))}
      {canEdit && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Plus className="w-3 h-3" />
              {selected.length === 0 ? "Add" : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search staff…" />
              <CommandList className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                <CommandEmpty>No staff found.</CommandEmpty>
                <CommandGroup>
                  {teamMembers.map((m) => {
                    const isSelected = list.includes(m.email);
                    return (
                      <CommandItem key={m.id} value={m.email} onSelect={() => toggle(m.email)}>
                        <div className="flex items-center gap-2 w-full">
                          <div className={cn("w-4 h-4 rounded border flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-input")}>
                            {isSelected && <span className="text-primary-foreground text-[10px]">✓</span>}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{m.full_name || m.email}</span>
                            {m.full_name && <span className="text-xs text-muted-foreground">{m.email}</span>}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      {selected.length === 0 && !canEdit && <span className="text-xs text-muted-foreground">—</span>}
    </div>
  );
}