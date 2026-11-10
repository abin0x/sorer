import React, { useState } from "react";
import { Users } from "lucide-react";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function DemoRoster({ players, teams }) {
  const [selectedTeam, setSelectedTeam] = useState("all");
  const filtered = selectedTeam === "all" ? players : players.filter((p) => p.team_id === selectedTeam);

  return (
    <div className="space-y-6" data-tour="roster">
      <div>
        <h2 className="text-2xl font-extrabold mb-1 text-slate-900">Player Roster</h2>
        <p className="text-slate-700">Player profiles, team assignments, and guardian contacts — all in one place.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedTeam("all")} className="px-4 py-2 rounded-lg text-sm font-bold transition-colors min-h-[44px]" style={selectedTeam === "all" ? { background: p(), color: "white" } : { background: "white", color: "hsl(213 59% 11%)", border: "1px solid hsl(220 14% 88%)" }}>
          All Players ({players.length})
        </button>
        {teams.map((t) => {
          const count = players.filter((pl) => pl.team_id === t.id).length;
          return (
            <button key={t.id} onClick={() => setSelectedTeam(t.id)} className="px-4 py-2 rounded-lg text-sm font-bold transition-colors min-h-[44px]" style={selectedTeam === t.id ? { background: p(), color: "white" } : { background: "white", color: "hsl(213 59% 11%)", border: "1px solid hsl(220 14% 88%)" }}>
              {t.name} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl soft-shadow border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-600">
              <th className="px-5 py-3">Player</th>
              <th className="px-5 py-3 hidden sm:table-cell">Team</th>
              <th className="px-5 py-3 hidden md:table-cell">Age Group</th>
              <th className="px-5 py-3 hidden lg:table-cell">Guardian</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pl) => (
              <tr key={pl.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: p() }}>
                      {pl.first_name?.[0]}{pl.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{pl.first_name} {pl.last_name}</p>
                      <p className="text-xs text-slate-600 sm:hidden">{pl.team_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-slate-700 hidden sm:table-cell">{pl.team_name}</td>
                <td className="px-5 py-3 text-sm text-slate-700 hidden md:table-cell">{pl.age_group}</td>
                <td className="px-5 py-3 text-sm text-slate-700 hidden lg:table-cell">{pl.guardian_name}</td>
                <td className="px-5 py-3">
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: pl.status === "active" ? "hsl(142 70% 40% / 0.15)" : "hsl(38 63% 50% / 0.15)", color: pl.status === "active" ? "hsl(142 70% 30%)" : "hsl(38 63% 35%)" }}>{pl.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}