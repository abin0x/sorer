import React from "react";
import { Users, Star, Activity, Award, Target, TrendingUp } from "lucide-react";

const ICONS = [Users, Star, Activity, Award, Target, TrendingUp];

export default function COEMetricsRow({ metrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {metrics.map((m, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <div key={m.label} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              <Icon className="w-3 h-3" /> {m.label}
            </div>
            <p className="text-xl font-extrabold text-gray-900 mt-1">{m.value}</p>
          </div>
        );
      })}
    </div>
  );
}