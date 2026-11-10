import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, Shield, CalendarClock, Wallet } from "lucide-react";

const COUNT_ROWS = [
  { key: "members", label: "Members imported", icon: Users },
  { key: "teams", label: "Teams created", icon: Shield },
  { key: "events", label: "Events scheduled", icon: CalendarClock },
  { key: "payments", label: "Payment records", icon: Wallet },
];

export default function CompleteCard({ job }) {
  const counts = job.imported_counts || {};

  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Migration Complete</h2>
        <p className="text-sm text-slate-500 mt-1">Your club is live on Club Rudder.</p>
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
      {job.specialist_notes && (
        <div className="text-left flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
            {job.specialist_name?.[0]?.toUpperCase() || "S"}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Verified by {job.specialist_name}</p>
            <p className="text-sm text-slate-600 mt-0.5">"{job.specialist_notes}"</p>
          </div>
        </div>
      )}
      <Button asChild className="w-full">
        <Link to="/home">Go to My Dashboard</Link>
      </Button>
    </div>
  );
}