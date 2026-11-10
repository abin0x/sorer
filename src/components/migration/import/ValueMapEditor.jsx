import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ValueMapEditor({ uniqueValues, valueMap, options, onChange }) {
  if (!uniqueValues?.length) return null;
  return (
    <div className="rounded-md bg-slate-50 border border-slate-200 p-2 space-y-1.5">
      <p className="text-xs font-medium text-slate-500 mb-1">Map values → {options.join(" / ")}</p>
      {uniqueValues.map((u) => (
        <div key={u.value} className="flex items-center gap-2 text-xs">
          <span className="flex-1 truncate text-slate-700" title={u.value}>{u.value} <span className="text-slate-400">({u.count})</span></span>
          <Select
            value={valueMap[u.value] || "__none"}
            onValueChange={(v) => onChange({ ...valueMap, [u.value]: v === "__none" ? "" : v })}
          >
            <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue placeholder="— skip —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— skip —</SelectItem>
              {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}