import React, { useState, useRef, useEffect } from "react";
import { Search, Check } from "lucide-react";

// Inline searchable select — click to open a dropdown with a search input.
// options: [{ value, label }]
export function InlineSearchSelect({ value, options, onChange, placeholder = "—", className = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  if (!open) {
    return (
      <span
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`text-xs cursor-pointer hover:bg-muted/50 px-1.5 py-1 rounded-md truncate block min-w-16 ${className}`}
      >
        {selected ? selected.label : <span className="text-muted-foreground/50">{placeholder}</span>}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block min-w-40" onClick={(e) => e.stopPropagation()}>
      <div className="absolute top-full left-0 z-50 mt-1 w-56 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full h-7 pl-7 pr-2 text-xs border border-border rounded-md bg-background outline-none focus:border-primary"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto">
          <button
            onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 text-muted-foreground"
          >
            {placeholder}
          </button>
          {filtered.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center justify-between ${o.value === value ? "text-primary font-semibold" : "text-foreground"}`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check className="w-3 h-3 shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
          )}
        </div>
      </div>
      <span className="text-xs cursor-pointer px-1.5 py-1 rounded-md truncate block min-w-16 opacity-0">
        {selected ? selected.label : placeholder}
      </span>
    </div>
  );
}

export default InlineSearchSelect;