import React from "react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

// Reusable radial bar chart — concentric rings with a central metric.
// data: [{ name, value (0-100), color }]
// Themed: white bg in light mode, dark bg in dark mode.
export default function RadialScoreChart({ data, centerLabel, centerValue, height = 260, startAngle = 90, endAngle = -270 }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="relative rounded-lg bg-white dark:bg-slate-900 border border-border p-4">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            innerRadius="35%"
            outerRadius="100%"
            startAngle={startAngle}
            endAngle={endAngle}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              background={{ fill: "hsl(var(--surface-2))" }}
              barSize={14}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </RadialBar>
            <Tooltip
              contentStyle={{
                fontSize: 11,
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                color: "hsl(var(--foreground))",
              }}
              formatter={(value, _name, props) => [`${value}%`, props?.payload?.name || ""]}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{centerLabel}</p>
          )}
          <p className="text-3xl font-extrabold text-foreground">{centerValue}</p>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-[10px] text-muted-foreground font-medium">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}