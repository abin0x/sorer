import React from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, Tooltip, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from "recharts";
import { ArrowRight, Check, Circle } from "lucide-react";

export const NAVY = "#0B162B";

/* Browser chrome wrapper for every mock screen */
export function MockScreen({ title, color, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white">
      <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="ml-3 text-xs font-semibold text-slate-400 truncate">{title}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* A single stat tile */
export function StatTile({ label, value, trend, tone = "neutral", color }) {
  return (
    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
      <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400">{label}</div>
      <div className="text-xl font-extrabold mt-0.5" style={{ color: NAVY }}>{value}</div>
      <div className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${
        tone === "up" ? "text-emerald-600" : tone === "down" ? "text-rose-500" : "text-slate-400"
      }`}>
        {tone === "up" && <ArrowRight className="w-2.5 h-2.5 rotate-[-45deg]" />}
        {trend}
      </div>
    </div>
  );
}

/* Section label inside a mock screen */
export function ScreenLabel({ children, color }) {1
  return (
    <div className="text-[10px] font-bold tracking-wider uppercase mb-2" style={{ color }}>
      {children}
    </div>
  );
}

/* Area / line trend chart */
export function MiniArea({ data, color, height = 120 }) {
  const id = `grad-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="x" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ stroke: color, strokeOpacity: 0.2 }} contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
        <Area type="monotone" dataKey="y" stroke={color} strokeWidth={2.5} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* Vertical bar chart */
export function MiniBars({ data, color, height = 120 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
        <XAxis dataKey="x" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: color, fillOpacity: 0.08 }} contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
        <Bar dataKey="y" radius={[4, 4, 0, 0]} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Donut chart with breakdown */
export function MiniDonut({ data, color, height = 140 }) {
  const palette = [color, `${color}99`, `${color}55`, "#e2e8f0"];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={58} paddingAngle={2} stroke="none">
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* Radar chart for E.P.I.C. evaluations */
export function MiniRadar({ data, color, height = 160 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#64748b" }} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.3} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* A row in a mock list/table */
export function ListRow({ title, sub, status, color, width = "70%" }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
      <div className="w-7 h-7 rounded-lg shrink-0" style={{ background: `${color}22` }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-2 rounded-full bg-slate-200" style={{ width }} />
        <div className="h-1.5 rounded-full bg-slate-100" style={{ width: "55%" }} />
      </div>
      {status && (
        <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: `${color}15`, color }}>
          {status}
        </span>
      )}
    </div>
  );
}

/* Kanban columns */
export function MockKanban({ columns, color }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {columns.map((col, ci) => (
        <div key={ci} className="rounded-xl bg-slate-50 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{col.title}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white text-slate-500">{col.count}</span>
          </div>
          <div className="space-y-2">
            {col.items.map((item, ii) => (
              <div key={ii} className="p-2 rounded-lg bg-white shadow-sm border border-slate-100">
                <div className="h-1.5 w-6 rounded-full mb-1.5" style={{ background: color }} />
                <div className="h-1.5 rounded-full bg-slate-200 mb-1" style={{ width: "85%" }} />
                <div className="h-1.5 rounded-full bg-slate-100" style={{ width: "60%" }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Week calendar grid with event blocks */
export function MockCalendar({ days, color }) {
  const hours = ["3p", "4p", "5p", "6p", "7p", "8p"];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      <div className="grid grid-cols-7 gap-px bg-slate-100">
        <div className="bg-white" />
        {days.map((d, i) => (
          <div key={i} className="bg-white p-1.5 text-center">
            <div className="text-[9px] font-bold uppercase text-slate-400">{d.label}</div>
            <div className="text-[11px] font-extrabold" style={{ color: NAVY }}>{d.date}</div>
          </div>
        ))}
      </div>
      {hours.map((h, hi) => (
        <div key={hi} className="grid grid-cols-7 gap-px bg-slate-100">
          <div className="bg-white p-1 text-[8px] text-slate-300 text-right pr-1.5 pt-1">{h}</div>
          {days.map((d, di) => {
            const ev = d.events?.[h];
            return (
              <div key={di} className="bg-white min-h-[26px] p-0.5">
                {ev && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * (hi + di) }}
                    className="text-[8px] font-bold rounded px-1 py-0.5 truncate"
                    style={{ background: `${ev.color || color}22`, color: ev.color || color }}
                  >
                    {ev.label}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* Tournament bracket */
export function MockBracket({ rounds, color }) {
  return (
    <div className="flex gap-3 items-stretch overflow-x-auto pb-1">
      {rounds.map((round, ri) => (
        <div key={ri} className="flex flex-col justify-around gap-3 min-w-[120px]">
          <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400 text-center mb-1">{round.title}</div>
          {round.matches.map((m, mi) => (
            <div key={mi} className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className={`flex items-center justify-between px-2 py-1.5 text-[10px] font-bold ${m.a.win ? "text-white" : "text-slate-600"}`} style={m.a.win ? { background: color } : { background: "white" }}>
                <span className="truncate">{m.a.name}</span>
                <span>{m.a.score}</span>
              </div>
              <div className={`flex items-center justify-between px-2 py-1.5 text-[10px] font-bold ${m.b.win ? "text-white" : "text-slate-600"} border-t border-slate-100`} style={m.b.win ? { background: color } : { background: "white" }}>
                <span className="truncate">{m.b.name}</span>
                <span>{m.b.score}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* Player avatar cards grid */
export function PlayerCards({ players, color }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {players.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl border border-slate-100 p-3 text-center"
        >
          <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold" style={{ background: color }}>
            {p.initials}
          </div>
          <div className="text-[11px] font-bold truncate" style={{ color: NAVY }}>{p.name}</div>
          <div className="text-[9px] text-slate-400">{p.meta}</div>
          <div className="mt-1.5 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
            {p.tag}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* Progress bar */
export function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-slate-500">{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}