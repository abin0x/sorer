import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

function formatValue(value, format) {
  if (value == null || isNaN(value)) return "—";
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  }
  if (format === "percent") {
    return `${Math.round(value)}%`;
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function formatChange(change) {
  if (change == null || isNaN(change)) return null;
  const rounded = Math.round(Math.abs(change));
  return `${rounded}%`;
}

/**
 * KPI tile with big number, optional change vs previous period, and click-to-drill.
 * props: { label, value, format, change, icon, onClick, subtitle }
 */
export default function KpiTile({ label, value, format = "number", change, icon: Icon, onClick, subtitle }) {
  const changeStr = formatChange(change);
  const isUp = change != null && change > 0;
  const isDown = change != null && change < 0;
  const isFlat = change != null && change === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all min-h-[110px] touch-target"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{formatValue(value, format)}</div>
      <div className="flex items-center gap-1.5 mt-1.5 min-h-[20px]">
        {changeStr && isUp && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-3 h-3" /> {changeStr}
          </span>
        )}
        {changeStr && isDown && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            <TrendingDown className="w-3 h-3" /> {changeStr}
          </span>
        )}
        {changeStr && isFlat && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
            <Minus className="w-3 h-3" /> {changeStr}
          </span>
        )}
        {subtitle && !changeStr && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </button>
  );
}