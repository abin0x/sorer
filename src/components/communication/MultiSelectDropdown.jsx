import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronDown, X, Search } from "lucide-react";

export default function MultiSelectDropdown({ label, options, selected, onChange, searchable = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const allSelected = selected.length === 0;

  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  const filteredOptions = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const displayLabel = allSelected
    ? label
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label || `1 selected`
      : `${selected.length} selected`;

  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{label}</label>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-between text-sm h-10 rounded-lg ${!allSelected ? "border-primary text-primary bg-primary/5" : ""}`}
          >
            <span className="truncate">{displayLabel}</span>
            {!allSelected ? (
              <X className="w-3.5 h-3.5 ml-1 shrink-0" onClick={(e) => { e.stopPropagation(); onChange([]); }} />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1 shrink-0 opacity-60" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1.5" align="start">
          {searchable && (
            <div className="relative mb-1.5 px-1 pt-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-8 pl-8 text-sm" />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No options found</p>
            ) : filteredOptions.map((opt) => (
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
            <Button variant="ghost" size="sm" className="w-full mt-1 h-7 text-xs text-muted-foreground" onClick={() => onChange([])}>
              Clear All
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}