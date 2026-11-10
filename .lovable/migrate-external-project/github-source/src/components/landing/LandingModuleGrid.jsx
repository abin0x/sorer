import React from "react";
import { MODULES } from "@/components/features/moduleData";

export default function LandingModuleGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {MODULES.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.key}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 hover:border-amber-400/30 transition-all duration-300"
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${m.dot}`} />
            <Icon className="w-6 h-6 text-amber-400 mb-2" />
            <p className="text-sm font-semibold text-white leading-tight">{m.title}</p>
          </div>
        );
      })}
    </div>
  );
}