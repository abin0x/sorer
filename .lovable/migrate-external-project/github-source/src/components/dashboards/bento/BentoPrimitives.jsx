import React from "react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export function EmptyState({ text }) {
  return <p className="text-sm text-text-secondary text-center py-10">{text}</p>;
}

export function StatBlock({ value, label, sublabel, to }) {
  const content = (
    <div className={`text-center py-4 ${to ? "hover:opacity-80 transition-opacity cursor-pointer" : ""}`}>
      <p className="text-3xl font-extrabold text-action">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mt-1">{label}</p>
      {sublabel && <p className="text-xs text-text-secondary/70 mt-0.5">{sublabel}</p>}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export function StatGrid({ items }) {
  if (!items?.length) return <EmptyState text="No data yet" />;
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it, i) => {
        const tile = (
          <div className={`rounded-lg bg-action/5 p-3 text-center ${it.to ? "hover:bg-action/10 transition-colors cursor-pointer" : ""}`}>
            <p className="text-xl font-extrabold text-text-primary capitalize truncate">{it.value}</p>
            <p className="text-[11px] font-medium text-text-secondary mt-0.5 capitalize truncate">{it.label}</p>
          </div>
        );
        return it.to ? <Link key={i} to={it.to}>{tile}</Link> : <div key={i}>{tile}</div>;
      })}
    </div>
  );
}

export function ListRows({ rows }) {
  if (!rows?.length) return <EmptyState text="No data yet" />;
  return (
    <div className="space-y-1 max-h-72 overflow-y-auto">
      {rows.map((r, i) => {
        const row = (
          <div className={`flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-neutral-100 ${r.to ? "cursor-pointer" : ""}`}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{r.primary}</p>
              {r.secondary && <p className="text-xs text-text-secondary truncate">{r.secondary}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-text-primary capitalize">{r.right}</p>
              {r.rightSub && <p className="text-[10px] text-text-secondary capitalize">{r.rightSub}</p>}
            </div>
          </div>
        );
        return r.to ? <Link key={i} to={r.to}>{row}</Link> : <div key={i}>{row}</div>;
      })}
    </div>
  );
}

export function ProgressRows({ rows }) {
  if (!rows?.length) return <EmptyState text="No data yet" />;
  return (
    <div className="space-y-3 py-1">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-text-primary truncate">{r.label}</span>
            <span className="text-text-secondary">{r.displayText}</span>
          </div>
          <Progress value={r.pct} className="h-2" />
        </div>
      ))}
    </div>
  );
}