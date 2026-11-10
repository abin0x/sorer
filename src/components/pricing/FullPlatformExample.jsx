import React from "react";

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;

/**
 * Worked example: all add-on modules, volume discounts applied most expensive
 * first, then each tier's own discount on top. Computed from the live config.
 */
export default function FullPlatformExample({ config }) {
  const modules = [...config.modules].sort((a, b) => b.list_price - a.list_price);
  const multipliers = config.volume_multipliers || [];
  const list = modules.reduce((s, m) => s + m.list_price, 0);
  const afterVolume = modules.reduce((s, m, i) => s + m.list_price * (multipliers[i] ?? multipliers[multipliers.length - 1] ?? 1), 0);

  return (
    <div className="max-w-3xl mx-auto mt-10 pub-card p-6 text-left">
      <p className="pub-eye mb-2">Worked example</p>
      <h3 className="pub-display text-xl mb-1">The full platform, all {modules.length} modules</h3>
      <p className="text-sm pub-muted mb-4">
        List price {fmt(list)}/yr. Volume discounts bring it to {fmt(afterVolume)}/yr, then your tier discount applies on top.
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        {config.tiers.map((t) => {
          const off = t.module_discount_percent || 0;
          return (
            <div key={t.key} className="rounded-xl border border-slate-200 dark:border-[#2a3a33] p-4">
              <p className="font-extrabold">{t.name}</p>
              <p className="text-2xl font-extrabold text-primary mt-1">{fmt(afterVolume * (1 - off / 100))}</p>
              <p className="text-xs pub-muted">per year, billed annually{off ? ` (${off}% tier discount)` : ""}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}