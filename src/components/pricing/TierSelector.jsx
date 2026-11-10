import React from "react";
import { Check } from "lucide-react";
import { tierFeatures } from "@/lib/pricingCalculator";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function TierSelector({ tiers, tierKey, onSelect }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {tiers.map((t) => {
        const active = t.key === tierKey;
        const features = tierFeatures(t);
        return (
          <button
            key={t.key}
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(t.key)}
            className={`text-left p-4 rounded-xl border-2 transition-all flex flex-col ${active ? "" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"}`}
            style={active ? { borderColor: p(), background: p(0.06) } : {}}
          >
            <p className="font-extrabold text-slate-900 dark:text-white">{t.name}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{t.best_for}</p>
            <p className="text-sm font-extrabold mb-3" style={{ color: p() }}>${Number(t.per_player_cost || 0).toFixed(2)}<span className="text-[11px] font-semibold text-slate-500"> / extra player / yr</span></p>
            <ul className="space-y-1.5 mt-auto">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <Check className="w-3 h-3 mt-0.5 shrink-0" style={{ color: p() }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}