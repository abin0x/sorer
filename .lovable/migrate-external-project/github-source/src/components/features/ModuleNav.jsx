import React from "react";
import { MODULES } from "./moduleData";

export default function ModuleNav() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {MODULES.map((m) => {
        const Icon = m.icon;
        return (
          <a
            key={m.key}
            href={`#${m.key}`}
            className={`group flex flex-col items-center text-center gap-2 p-4 rounded-xl border ${m.border} bg-white dark:bg-slate-900 hover:shadow-md transition-all`}
          >
            <div className={`p-2.5 rounded-lg ${m.iconBg}`}>
              <Icon className={`w-5 h-5 ${m.iconText}`} />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">
              {m.title}
            </span>
          </a>
        );
      })}
    </div>
  );
}