import React from "react";
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function COECharts({ chartData, activeTab }) {
  const { averages, distribution, trends } = chartData;
  const hasAverages = averages.length > 0 && averages.some(d => Object.values(d).some(v => typeof v === "number" && v > 0));
  const hasDist = distribution.length > 0 && distribution.some(d => Object.values(d).some(v => typeof v === "number" && v > 0));
  const hasTrends = trends.length > 0;

  const barKeys = averages[0] ? Object.keys(averages[0]).filter(k => k !== "name" && k !== "avg") : [];
  const useSingleBar = barKeys.length === 0 && averages[0]?.avg != null;
  const distKeys = distribution[0] ? Object.keys(distribution[0]).filter(k => k !== "metric") : ["All"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Averages — thin bars */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Averages</h3>
        {hasAverages ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={averages} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#999" }} angle={-20} textAnchor="end" height={40} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #eee" }} cursor={{ fill: "#f9fafb" }} />
              {barKeys.length > 0 && <Legend wrapperStyle={{ fontSize: 9 }} iconType="circle" />}
              {useSingleBar ? (
                <Bar dataKey="avg" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
              ) : (
                barKeys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} barSize={8} />)
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </div>

      {/* Distribution — beautiful radial chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Distribution</h3>
        {hasDist ? (
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={distribution} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <PolarGrid stroke="#eee" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "#999" }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: "#ccc" }} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #eee" }} />
              {distKeys.map((k, i) => (
                <Radar key={k} name={k} dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </div>

      {/* Trends — thin line */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Trends</h3>
        {hasTrends ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trends} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #eee" }} />
              <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2, fill: "#10b981" }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">No data for the selection</div>;
}