import React, { useState, useMemo } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Search, X } from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function COECompareTeams({ teamDashboards, playerStats }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return teamDashboards;
    const q = search.toLowerCase();
    return teamDashboards.filter(t => t.name.toLowerCase().includes(q));
  }, [teamDashboards, search]);

  const toggle = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 5 ? [...s, id] : s);
  };

  const selectedTeams = teamDashboards.filter(t => selected.includes(t.id));

  // Compute team-level averages from playerStats
  const teamMetrics = useMemo(() => {
    return selectedTeams.map(team => {
      const teamPlayers = playerStats.filter(p => p.teamId === team.id);
      const wS = teamPlayers.filter(p => p.skillAvg != null);
      const wP = teamPlayers.filter(p => p.physicalAvg != null);
      const wE = teamPlayers.filter(p => p.evalAvg != null);
      const wEp = teamPlayers.filter(p => p.epicComposite != null);
      const avg = (arr) => arr.length ? Math.round(arr.reduce((s, p) => s + p, 0) / arr.length) : 0;
      return {
        id: team.id,
        name: team.name,
        players: teamPlayers.length,
        skillAvg: avg(wS.map(p => p.skillAvg)),
        physicalAvg: avg(wP.map(p => p.physicalAvg)),
        evalAvg: avg(wE.map(p => p.evalAvg)),
        epicAvg: avg(wEp.map(p => p.epicComposite)),
        coverage: teamPlayers.length ? Math.round((wS.length / teamPlayers.length) * 100) : 0,
      };
    });
  }, [selectedTeams, playerStats]);

  // Radar data
  const radarData = useMemo(() => {
    const metrics = ["Skill", "Physical", "Eval", "EPIC"];
    return metrics.map(m => {
      const key = m.toLowerCase() + "Avg";
      const point = { metric: m };
      teamMetrics.forEach(t => { point[t.name] = t[key] ?? 0; });
      return point;
    });
  }, [teamMetrics]);

  // Bar data
  const barData = useMemo(() => {
    return teamMetrics.map(t => ({
      name: t.name.substring(0, 10),
      Skill: t.skillAvg, Physical: t.physicalAvg, Eval: t.evalAvg, EPIC: t.epicAvg,
    }));
  }, [teamMetrics]);

  return (
    <div className="space-y-3">
      {/* Team picker */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Select Teams to Compare ({selected.length}/5)</h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams..." className="h-7 pl-7 pr-2 text-xs rounded-md border border-gray-200 w-48" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selected.includes(t.id) ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
            >
              {t.name}
              {selected.includes(t.id) && <X className="w-2.5 h-2.5 inline ml-1" />}
            </button>
          ))}
        </div>
      </div>

      {selectedTeams.length < 2 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-sm text-gray-400">Select at least 2 teams to compare their metrics.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Radar */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Team Averages Comparison</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#eee" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#777" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: "#ccc" }} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #eee" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                  {selectedTeams.map((t, i) => (
                    <Radar key={t.id} name={t.name} dataKey={t.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.08} strokeWidth={2} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Score Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#999" }} angle={-20} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #eee" }} cursor={{ fill: "#f9fafb" }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} iconType="circle" />
                  <Bar dataKey="Skill" fill="#10b981" barSize={6} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Physical" fill="#3b82f6" barSize={6} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Eval" fill="#f59e0b" barSize={6} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="EPIC" fill="#8b5cf6" barSize={6} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary table */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Team Summary</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 text-[10px] text-gray-500 uppercase">Team</th>
                  <th className="text-right py-1.5 text-[10px] text-gray-500 uppercase">Players</th>
                  <th className="text-right py-1.5 text-[10px] text-gray-500 uppercase">Skill</th>
                  <th className="text-right py-1.5 text-[10px] text-gray-500 uppercase">Physical</th>
                  <th className="text-right py-1.5 text-[10px] text-gray-500 uppercase">Eval</th>
                  <th className="text-right py-1.5 text-[10px] text-gray-500 uppercase">EPIC</th>
                  <th className="text-right py-1.5 text-[10px] text-gray-500 uppercase">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {teamMetrics.map((t, i) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-1.5 font-medium" style={{ color: COLORS[i % COLORS.length] }}>{t.name}</td>
                    <td className="py-1.5 text-right text-gray-600">{t.players}</td>
                    <td className="py-1.5 text-right font-medium">{t.skillAvg || "—"}</td>
                    <td className="py-1.5 text-right font-medium">{t.physicalAvg || "—"}</td>
                    <td className="py-1.5 text-right font-medium">{t.evalAvg || "—"}</td>
                    <td className="py-1.5 text-right font-medium">{t.epicAvg || "—"}</td>
                    <td className="py-1.5 text-right text-gray-600">{t.coverage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}