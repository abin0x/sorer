import React from "react";
import { FOUNDING_OFFER_ENDS } from "@/lib/pricingCalculator";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;
const fmt = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PriceSummary({ result, foundingSpotsLeft = 0 }) {
  const { tier, setupTotal, setupTotalBeforeWaiver, setupWaived, playerTotal, moduleBreakdown, moduleTotal, discountPercent, grandTotal, ongoingAnnual, totalSavings } = result;
  const perPlayer = tier.per_player_cost || 0;

  return (
    <div className="pub-card p-6 sticky top-24" style={{ borderColor: p(), borderWidth: 2 }}>
      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: p() }}>{tier.name} · Year 1 estimate</p>
      <div className="text-4xl font-extrabold text-slate-900 dark:text-white mb-1">{fmt(grandTotal)}</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Billed annually · {fmt(perPlayer)}/player/yr</p>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">Setup fee</span>
          {setupWaived ? (
            <span className="font-semibold">
              <span className="line-through text-slate-400 mr-2">{fmt(setupTotalBeforeWaiver)}</span>
              <span className="text-emerald-600 dark:text-emerald-400">Waived</span>
            </span>
          ) : (
            <span className="font-semibold text-slate-900 dark:text-white">{fmt(setupTotal)}</span>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Per-player cost ({fmt(perPlayer)}/yr)</span>
          <span className="font-semibold text-slate-900 dark:text-white">{fmt(playerTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Add-on modules{discountPercent > 0 ? ` (${discountPercent}% tier discount)` : ""}</span>
          <span className="font-semibold text-slate-900 dark:text-white">{fmt(moduleTotal)}</span>
        </div>
      </div>

      {moduleBreakdown.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5 mb-3">
          {moduleBreakdown.map((m) => (
            <div key={m.key} className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{m.name} {m.discountPercent > 0 ? `(${m.discountPercent}% off)` : ""}</span>
              <span>{fmt(m.price)}</span>
            </div>
          ))}
        </div>
      )}

      {totalSavings > 0 && (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
          You're saving {fmt(totalSavings)} on add-ons with volume + tier discounts.
        </p>
      )}

      {setupWaived && foundingSpotsLeft > 0 && (
        <p className="text-xs font-semibold mb-3" style={{ color: p() }}>
          Only {foundingSpotsLeft} founding spots left — setup waived, rate locked until {FOUNDING_OFFER_ENDS}.
        </p>
      )}

      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600 dark:text-slate-400 text-sm">Year 2+ (ongoing)</span>
          <span className="font-extrabold text-slate-900 dark:text-white">{fmt(ongoingAnnual)}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">No setup fee after Year 1. Billed annually.</p>
        <p className="text-[11px] text-slate-400 mt-2">Grow into the next tier anytime — your rates simply switch. No re-setup, no downtime.</p>
      </div>
    </div>
  );
}