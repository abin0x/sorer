import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronDown, Plus, Search, ArrowUpDown } from "lucide-react";

export function MultiAssignSelect({ selected = [], options, onChange, placeholder = "Assign", searchable = true, sortable = true }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  const selectedNames = options.filter((o) => selected.includes(o.value)).map((o) => o.label);

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const filtered = useMemo(() => {
    let list = options;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) => o.label?.toLowerCase().includes(q));
    }
    if (sortable) {
      list = [...list].sort((a, b) => {
        const cmp = (a.label || "").localeCompare(b.label || "");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [options, search, sortDir, sortable]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className="text-xs cursor-pointer hover:bg-muted/50 px-1.5 py-1 rounded-md truncate block flex items-center gap-1 min-w-16">
          {selectedNames.length > 0 ? (
            <>
              <span className="truncate">{selectedNames.join(", ")}</span>
              <span className="bg-primary/10 text-primary text-[9px] px-1 rounded-full shrink-0">{selectedNames.length}</span>
            </>
          ) : (
            <span className="text-muted-foreground/50 flex items-center gap-0.5"><Plus className="w-2.5 h-2.5" />{placeholder}</span>
          )}
          <ChevronDown className="w-2.5 h-2.5 shrink-0 text-muted-foreground" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {searchable && (
          <div className="relative px-1 pb-1">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs pl-7 rounded-md"
            />
            {sortable && (
              <button
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
              >
                <ArrowUpDown className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">{options.length === 0 ? "No options available" : "No matches"}</p>
          ) : filtered.map((opt) => (
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
          <button
            className="w-full mt-1 text-xs text-muted-foreground hover:text-destructive p-1.5 rounded"
            onClick={() => onChange([])}
          >
            Clear All
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default MultiAssignSelect;