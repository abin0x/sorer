import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, X } from "lucide-react";

export default function MultiSelectFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === 0;

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayLabel = allSelected
    ? `All ${label}`
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label || `${selected.length} ${label}`
      : `${selected.length} ${label}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 text-xs justify-between gap-1 ${!allSelected ? "border-primary text-primary bg-primary/5" : ""}`}
        >
          {displayLabel}
          {!allSelected ? (
            <X
              className="w-3 h-3 ml-1 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
                setOpen(false);
              }}
            />
          ) : (
            <ChevronDown className="w-3 h-3 ml-1 shrink-0" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        <div className="max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer text-sm"
              onClick={() => toggle(opt.value)}
            >
              <Checkbox checked={selected.includes(opt.value)} className="pointer-events-none" />
              <span className="truncate">{opt.label}</span>
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 h-7 text-xs text-muted-foreground"
            onClick={() => onChange([])}
          >
            Clear All
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}