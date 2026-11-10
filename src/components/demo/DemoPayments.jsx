import React from "react";
import { Wallet, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

const statusConfig = {
  paid_in_full: { label: "Paid", icon: CheckCircle2, bg: "hsl(142 70% 40% / 0.15)", color: "hsl(142 70% 30%)" },
  active: { label: "Active", icon: Clock, bg: "hsl(210 70% 50% / 0.15)", color: "hsl(210 70% 40%)" },
  past_due: { label: "Past Due", icon: AlertCircle, bg: "hsl(0 70% 50% / 0.15)", color: "hsl(0 70% 40%)" },
};

export default function DemoPayments({ payments }) {
  const totalBilled = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalCollected = payments.filter((p) => p.status === "paid_in_full").reduce((s, p) => s + (p.amount || 0), 0);
  const totalOverdue = payments.filter((p) => p.status === "past_due").reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-6" data-tour="payments">
      <div>
        <h2 className="text-2xl font-extrabold mb-1 text-slate-900">Payments Ledger</h2>
        <p className="text-slate-700">Registration fees, payment tracking, and QuickBooks sync — without manual data entry.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl soft-shadow border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Total Billed</div>
          <div className="text-3xl font-extrabold text-slate-900">${totalBilled.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl soft-shadow border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Collected</div>
          <div className="text-3xl font-extrabold" style={{ color: "hsl(142 70% 30%)" }}>${totalCollected.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl soft-shadow border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Past Due</div>
          <div className="text-3xl font-extrabold" style={{ color: "hsl(0 70% 40%)" }}>${totalOverdue.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl soft-shadow border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-600">
              <th className="px-5 py-3">Player</th>
              <th className="px-5 py-3 hidden sm:table-cell">Description</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((pay) => {
              const cfg = statusConfig[pay.status] || { label: pay.status, icon: Wallet, bg: "hsl(220 14% 96%)", color: "hsl(213 59% 30%)" };
              const Icon = cfg.icon;
              return (
                <tr key={pay.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">{pay.player_name}</td>
                  <td className="px-5 py-3 text-sm text-slate-700 hidden sm:table-cell">{pay.source_label}</td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-900">${pay.amount?.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(210 70% 50% / 0.12)" }}>
          <Wallet className="w-5 h-5" style={{ color: "hsl(210 70% 40%)" }} />
        </div>
        <div>
          <p className="font-bold text-sm text-slate-900">QuickBooks Sync</p>
          <p className="text-xs text-slate-600">In your trial, connect QuickBooks to sync every payment automatically — no manual entry.</p>
        </div>
      </div>
    </div>
  );
}