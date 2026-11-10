import React from "react";
import { Users, Calendar, GitBranch, Wallet, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function DemoOverview({ club, branches, teams, players, events, payments }) {
  const upcomingEvents = events.filter((e) => new Date(e.start_datetime) > new Date()).slice(0, 5);
  const paidCount = payments.filter((p) => p.status === "paid_in_full").length;
  const overdueCount = payments.filter((p) => p.status === "past_due").length;

  const stats = [
    { icon: GitBranch, label: "Branches", value: branches.length, color: "340 60% 50%" },
    { icon: Users, label: "Teams", value: teams.length, color: "210 70% 50%" },
    { icon: Users, label: "Players", value: players.length, color: "280 55% 50%" },
    { icon: Calendar, label: "Upcoming Events", value: upcomingEvents.length, color: "157 47% 42%" },
    { icon: CheckCircle2, label: "Paid", value: paidCount, color: "142 70% 40%" },
    { icon: AlertCircle, label: "Past Due", value: overdueCount, color: "0 70% 50%" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold mb-1 text-slate-900">Club Dashboard</h2>
        <p className="text-slate-700">A consolidated view of {club.name} across all branches.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-4 soft-shadow border border-slate-200">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `hsl(${s.color} / 0.15)` }}>
                <Icon className="w-5 h-5" style={{ color: `hsl(${s.color})` }} />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{s.value}</div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl soft-shadow border border-slate-200 p-5">
          <h3 className="font-extrabold mb-4 text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4" style={{ color: p() }} /> Upcoming Events</h3>
          <div className="space-y-3">
            {upcomingEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: p(0.1) }}>
                  <span className="text-xs font-bold" style={{ color: p() }}>{new Date(e.start_datetime).toLocaleDateString("en", { month: "short" })}</span>
                  <span className="text-sm font-extrabold leading-none text-slate-900">{new Date(e.start_datetime).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-slate-900 truncate">{e.title}</p>
                  <p className="text-xs text-slate-600">{e.team_names?.join(", ") || "—"} · {new Date(e.start_datetime).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full capitalize shrink-0" style={{ background: e.event_type === "game" ? "hsl(38 63% 50% / 0.15)" : p(0.12), color: e.event_type === "game" ? "hsl(38 63% 35%)" : p() }}>{e.event_type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl soft-shadow border border-slate-200 p-5">
          <h3 className="font-extrabold mb-4 text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: p() }} /> Teams at a Glance</h3>
          <div className="space-y-3">
            {teams.map((t) => {
              const teamPlayers = players.filter((pl) => pl.team_id === t.id);
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-600">{t.location_name} · {t.league}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-900">{teamPlayers.length} players</p>
                    <p className="text-xs text-slate-600">{t.playing_format}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}