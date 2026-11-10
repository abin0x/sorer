import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Search, ChevronDown } from "lucide-react";
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

/**
 * Multi-select staff picker backed by the User entity.
 * value is an array of staff emails; onValueChange returns the new array.
 */
export default function StaffMultiSelect({ value = [], onValueChange, placeholder = "Select staff…", tone = "sky" }) {
  const [open, setOpen] = useState(false);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const selected = teamMembers.filter((m) => value.includes(m.email));

  const toggle = (email) => {
    if (value.includes(email)) {
      onValueChange(value.filter((e) => e !== email));
    } else {
      onValueChange([...value, email]);
    }
  };

  const toneClasses = {
    sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900 dark:text-sky-300 dark:border-sky-800",
    violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-300 dark:border-violet-800",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-800",
    slate: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between dark:bg-slate-800 dark:border-slate-700 font-normal"
          >
            <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
              {selected.length > 0 ? `${selected.length} selected` : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search staff…" />
            <CommandList className="overflow-y-auto" style={{ maxHeight: '280px' }}>
              <CommandEmpty>No staff found.</CommandEmpty>
              <CommandGroup>
                {teamMembers.map((member) => {
                  const isSelected = value.includes(member.email);
                  return (
                    <CommandItem
                      key={member.id}
                      value={member.email}
                      onSelect={() => toggle(member.email)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-input")}>
                          {isSelected && <span className="text-primary-foreground text-[10px]">✓</span>}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{member.full_name || member.email}</span>
                          {member.full_name && <span className="text-xs text-muted-foreground">{member.email}</span>}
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

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((m) => (
            <Badge key={m.email} variant="outline" className={cn("text-xs gap-1 pr-1", toneClasses[tone] || toneClasses.sky)}>
              <span>{m.full_name || m.email.split("@")[0]}</span>
              <button
                type="button"
                onClick={() => toggle(m.email)}
                className="rounded-full hover:bg-black/10 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}