import React from "react";
import { GitBranch, Users, Wallet, TrendingUp } from "lucide-react";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function DemoBranches({ branches, teams, players, payments }) {
  return (
    <div className="space-y-6" data-tour="branches">
      <div>
        <h2 className="text-2xl font-extrabold mb-1 text-slate-900">Multi-Branch Dashboard</h2>
        <p className="text-slate-700">Consolidated reporting across every branch — one club, one source of truth.</p>
      </div>

      <div className="bg-white rounded-xl soft-shadow border border-slate-200 p-6">
        <h3 className="font-extrabold mb-4 text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: p() }} /> Consolidated Totals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-3xl font-extrabold text-slate-900">{branches.length}</div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Branches</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">{teams.length}</div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Teams</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">{players.length}</div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Players</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">${payments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}</div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Billed</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {branches.map((branch) => {
          const branchTeams = teams.filter((t) => t.location_id === branch.id);
          const branchPlayers = players.filter((pl) => pl.location_id === branch.id);
          const branchRevenue = branchPlayers.length * 850;
          return (
            <div key={branch.id} className="bg-white rounded-xl soft-shadow border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: p(0.12) }}>
                  <GitBranch className="w-5 h-5" style={{ color: p() }} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900">{branch.name}</h3>
                  <p className="text-xs text-slate-600">{branch.city}, {branch.state} · {branch.branch_director_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <Users className="w-4 h-4 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-extrabold text-slate-900">{branchTeams.length}</div>
                  <div className="text-xs text-slate-600">Teams</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <Users className="w-4 h-4 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-extrabold text-slate-900">{branchPlayers.length}</div>
                  <div className="text-xs text-slate-600">Players</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <Wallet className="w-4 h-4 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-extrabold text-slate-900">${branchRevenue.toLocaleString()}</div>
                  <div className="text-xs text-slate-600">Est. Revenue</div>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {branchTeams.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{t.name}</span>
                    <span className="text-slate-600">{players.filter((pl) => pl.team_id === t.id).length} players</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}