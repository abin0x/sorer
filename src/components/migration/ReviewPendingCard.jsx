import React from "react";
import { UserCheck, Users, Shield, CalendarClock, Wallet, AlertTriangle } from "lucide-react";

const COUNT_ROWS = [
  { key: "members", label: "Members", icon: Users },
  { key: "teams", label: "Teams", icon: Shield },
  { key: "events", label: "Events", icon: CalendarClock },
  { key: "payments", label: "Payments", icon: Wallet },
];

export default function ReviewPendingCard({ job }) {
  const counts = job.preview_counts || {};
  const warnings = job.warnings || [];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-slate-900">Migration Preview</h2>
        <p className="text-sm text-slate-500 mt-1">Here's what we found in your files.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COUNT_ROWS.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.key} className="rounded-xl border border-slate-200 p-3 text-center">
              <Icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
              <div className="text-lg font-extrabold text-slate-900">{counts[row.key] ?? 0}</div>
              <div className="text-[11px] text-slate-500">{row.label}</div>
            </div>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <UserCheck className="w-4.5 h-4.5 text-primary" />
        </div>
        <p className="text-sm text-slate-700">
          <span className="font-bold">Our support team is reviewing your data.</span> A migration expert checks every
          migration before it goes live — we'll notify you as soon as it's mapped properly.
        </p>
      </div>
    </div>
  );
}