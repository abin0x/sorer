import React from "react";
import { PartyPopper, ArrowRight, GitBranch, Users, ClipboardCheck, Calendar, Activity, Wallet, CheckCircle2 } from "lucide-react";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function CompletionStep({ summary, onEnterDashboard, isLive }) {
  const items = [
    { icon: GitBranch, label: "Branches", value: summary?.branches || 0 },
    { icon: Users, label: "Teams", value: summary?.teams || 0 },
    { icon: Users, label: "Players", value: summary?.players || 0 },
    { icon: ClipboardCheck, label: "Coaches", value: summary?.coaches || 0 },
    { icon: Calendar, label: "Events", value: summary?.events || 0 },
    { icon: Activity, label: "Evaluations", value: summary?.evaluations || 0 },
    { icon: Wallet, label: "Payments", value: summary?.payments || 0 },
  ];

  return (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: p() }}>
        <PartyPopper className="w-8 h-8 text-white" />
      </div>

      <div>
        <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Your club is ready!</h3>
        <p className="text-slate-600">
          {isLive
            ? "Everything has been created. Explore your fully populated dashboard — teams, players, schedules, evaluations, payments, and more."
            : "Start your free trial to save this club and unlock the full dashboard — teams, players, schedules, evaluations, payments, and more."}
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-2.5 text-left">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: p(0.12) }}>
                  <Icon className="w-4 h-4" style={{ color: p() }} />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-slate-900 leading-none">{item.value}</p>
                  <p className="text-xs text-slate-500 font-semibold">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={onEnterDashboard}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-bold text-white transition-opacity hover:opacity-90 min-h-[44px]"
        style={{ background: p() }}
      >
        {isLive ? "Enter your dashboard" : "Start free trial"} <ArrowRight className="w-4 h-4" />
      </button>

      {isLive && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <CheckCircle2 className="w-4 h-4" style={{ color: p() }} />
          30-day free trial · Full access · No credit card required
        </div>
      )}
    </div>
  );
}