import React from "react";
import { MODULES } from "@/components/features/moduleData";

/**
 * The module(s) a solutions page covers, rendered straight from the platform's
 * own module data (src/components/features/moduleData.js) — same titles,
 * descriptions and highlights as /features, so the page mirrors the app.
 *
 * `modules` is [{ key, features? }]; omit `features` to show the whole module.
 */
export default function JobPageModules({ modules }) {
  const resolved = modules
    .map(({ key, features }) => {
      const module = MODULES.find((m) => m.key === key);
      if (!module) return null;
      const list = features ? module.features.filter((f) => features.includes(f.title)) : module.features;
      return { ...module, list };
    })
    .filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      {resolved.map((module) => (
        <section key={module.key}>
          <div className="flex items-start gap-3 mb-6">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${module.iconBg}`}>
              <module.icon className={`w-5 h-5 ${module.iconText}`} />
            </div>
            <div>
              <h2 className="pub-display text-xl md:text-2xl text-slate-900 dark:text-[#F5F1E8]">{module.title}</h2>
              <p className="text-sm pub-muted mt-1">{module.tagline}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {module.list.map((feature) => (
              <article key={feature.title} className={`pub-card p-5 border ${module.border}`}>
                <feature.icon className={`w-5 h-5 mb-3 ${module.iconText}`} />
                <h3 className="font-extrabold text-base mb-1.5 text-slate-900 dark:text-[#F5F1E8]">{feature.title}</h3>
                <p className="text-sm pub-muted leading-relaxed mb-3">{feature.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {feature.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1c2622] text-slate-600 dark:text-[#a9a495]"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}