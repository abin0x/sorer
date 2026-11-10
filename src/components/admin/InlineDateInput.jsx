import React, { useState } from "react";

// Inline date input — click to edit, shows a native date picker.
export function InlineDateInput({ value, onChange, className = "" }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <span
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className={`text-xs cursor-pointer hover:bg-muted/50 px-1.5 py-1 rounded-md text-center block min-w-20 ${className}`}
      >
        {value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : <span className="text-muted-foreground/50">—</span>}
      </span>
    );
  }

  return (
    <input
      autoFocus
      type="date"
      value={value ? new Date(value).toISOString().split("T")[0] : ""}
      onChange={(e) => { onChange(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
      onClick={(e) => e.stopPropagation()}
      className={`h-7 text-xs border border-border bg-white dark:bg-slate-900 rounded-md px-1.5 outline-none focus:border-primary ${className}`}
    />
  );
}

export default InlineDateInput;