import React, { useState, useMemo } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { Search, X } from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function COEComparePlayers({ playerStats, skillTests }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return playerStats;
    const q = search.toLowerCase();
    return playerStats.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
  }, [playerStats, search]);

  const toggle = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 6 ? [...s, id] : s);
  };

  const selectedPlayers = playerStats.filter(p => selected.includes(p.id));

  // Radar data: EPIC tenets
  const radarData = useMemo(() => {
    const metrics = ["Explosive", "Precise", "Insightful", "Combative"];
    return metrics.map(m => {
      const point = { metric: m };
      selectedPlayers.forEach(p => {
        const key = m.toLowerCase();
        point[p.name] = p[key] ?? 0;
      });
      return point;
    });
  }, [selectedPlayers]);

  // Bar data: skill test comparison
  const skillBarData = useMemo(() => {
    if (!skillTests.length) return [];
    return skillTests.map(t => {
      const point = { test: t.title.substring(0, 10) };
      selectedPlayers.forEach(p => {
        point[p.name] = p.skillByTest?.[t.id]?.score ?? 0;
      });
      return point;
    });
  }, [selectedPlayers, skillTests]);

  // Summary table
  const summaryRows = useMemo(() => {
    const metrics = [
      ["Skill Avg", "skillAvg"], ["Physical Avg", "physicalAvg"],
      ["Eval Avg", "evalAvg"], ["EPIC Composite", "epicComposite"],
      ["Explosive", "explosive"], ["Precise", "precise"],
      ["Insightful", "insightful"], ["Combative", "combative"],
    ];
    return metrics.map(([label, key]) => ({
      label,
      values: selectedPlayers.map(p => p[key] ?? "—"),
    }));
  }, [selectedPlayers]);

  return (
    <div className="space-y-3">
      {/* Player picker */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Select Players to Compare ({selected.length}/6)</h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players..." className="h-7 pl-7 pr-2 text-xs rounded-md border border-gray-200 w-48" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selected.includes(p.id) ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
            >
              {p.name} <span className="opacity-60">· {p.team}</span>
              {selected.includes(p.id) && <X className="w-2.5 h-2.5 inline ml-1" />}
            </button>
          ))}
        </div>
      </div>

      {selectedPlayers.length < 2 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-sm text-gray-400">Select at least 2 players to compare their metrics.</p>
        </div>
      ) : (
        <>
          {/* Radar: EPIC tenets */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">EPIC Tenets Comparison</h3>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#eee" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#777" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: "#ccc" }} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #eee" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                {selectedPlayers.map((p, i) => (
                  <Radar key={p.id} name={p.name} dataKey={p.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.08} strokeWidth={2} />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Bar: skill tests */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Skill Test Scores</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={skillBarData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="test" tick={{ fontSize: 9, fill: "#999" }} angle={-20} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #eee" }} cursor={{ fill: "#f9fafb" }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} iconType="circle" />
                  {selectedPlayers.map((p, i) => (
                    <Bar key={p.id} dataKey={p.name} fill={COLORS[i % COLORS.length]} barSize={6} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary table */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Metric Summary</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 text-[10px] text-gray-500 uppercase">Metric</th>
                    {selectedPlayers.map((p, i) => (
                      <th key={p.id} className="text-right py-1.5 text-[10px] font-semibold" style={{ color: COLORS[i % COLORS.length] }}>{p.name.split(" ")[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map(row => (
                    <tr key={row.label} className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-600">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="py-1.5 text-right font-medium text-gray-800">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}