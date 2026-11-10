import React from "react";
import { Check, Minus } from "lucide-react";
import { tierFeatures } from "@/lib/pricingCalculator";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;
const fmt = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Rows compare the three tiers across the dimensions buyers care about.
const ROWS = [
  { label: "Best for", render: (t) => <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.best_for}</span> },
  { label: "Per extra player / year", render: (t) => `${fmt(t.per_player_cost)}` },
  { label: "Module discount", render: (t) => `${t.module_discount_percent}%` },
  { label: "Registration & tryouts", render: () => <Check className="w-4 h-4 text-emerald-500" /> },
  { label: "Messaging & channels", render: () => <Check className="w-4 h-4 text-emerald-500" /> },
  { label: "Calendars & scheduling", render: () => <Check className="w-4 h-4 text-emerald-500" /> },
  { label: "Club dues payments", render: () => <Check className="w-4 h-4 text-emerald-500" /> },
];

export default function TierComparison({ tiers, config }) {
  const base = config?.base_license_fee ?? 1995;
  const incl = config?.base_players_included ?? 250;
  const allFeatures = [...new Set(tiers.flatMap((t) => tierFeatures(t)))];
  const rows = [
    ROWS[0],
    { label: "Base license / year", render: () => `${fmt(base)} (first ${incl} players)` },
    ...ROWS.slice(1, 7),
    ...allFeatures.map((f) => ({ label: f, render: (t) => tierFeatures(t).includes(f) ? <Check className="w-4 h-4 text-emerald-500" /> : <Minus className="w-4 h-4 text-slate-300" /> })),
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-4 text-xs font-bold uppercase tracking-wider text-slate-400 w-1/3">Compare plans</th>
            {tiers.map((t) => (
              <th key={t.key} className="text-left p-4">
                <p className="font-extrabold text-slate-900 dark:text-white text-base">{t.name}</p>
                <p className="text-xs font-semibold" style={{ color: p() }}>{t.subtitle}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? "bg-slate-50 dark:bg-slate-900/50" : ""}>
              <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{row.label}</td>
              {tiers.map((t) => (
                <td key={t.key} className="p-4 font-semibold text-slate-900 dark:text-white">{row.render(t)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}