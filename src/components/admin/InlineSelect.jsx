import React, { useState } from "react";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";

export function InlineSelect({ value, options, onChange, placeholder = "—", className = "" }) {
  const [editing, setEditing] = useState(false);
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));

  if (!editing) {
    const selected = items.find((o) => o.value === value);
    return (
      <span
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className={`text-xs cursor-pointer hover:bg-muted/50 px-1.5 py-1 rounded-md truncate block min-w-16 ${className}`}
      >
        {selected ? selected.label : <span className="text-muted-foreground/50">{placeholder}</span>}
      </span>
    );
  }

  return (
    <ResponsiveSelect
      autoFocus
      autoOpen
      value={value || ""}
      onChange={(v) => { onChange(v); setEditing(false); }}
      onDismiss={() => setEditing(false)}
      options={items}
      placeholder={placeholder}
      ariaLabel="Change selection"
      className={`h-7 text-xs py-0 ${className}`}
    />
  );
}

export default InlineSelect;