import React from "react";
import { Checkbox } from "@/components/ui/checkbox";

export default function ModuleSelector({ modules, selectedKeys, onToggle }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {modules.map((m) => {
        const checked = selectedKeys.includes(m.key);
        return (
          <label
            key={m.key}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${checked ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <Checkbox checked={checked} onCheckedChange={() => onToggle(m.key)} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-900 text-sm">{m.name}</p>
                <p className="text-sm font-bold text-slate-900 whitespace-nowrap">${Number(m.list_price).toFixed(0)}/yr</p>
              </div>
              {m.notes && <p className="text-xs text-slate-500 mt-1">{m.notes}</p>}
            </div>
          </label>
        );
      })}
    </div>
  );
}