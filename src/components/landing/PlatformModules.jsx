import React from "react";
import { Link } from '@/lib/router-compat';
import { ArrowRight } from "lucide-react";
import { MODULES } from "@/components/features/moduleData";
import { MODULE_LINKS } from "@/lib/landing/jobPages";

/**
 * Every platform module this solutions page does not already cover in detail,
 * so each page still mirrors the whole app: registration and tryouts, messaging
 * and calendars, storefront and bookkeeping, player development, facilities,
 * tournaments, website and marketing, and kanban.
 */
export default function PlatformModules({ exclude = [] }) {
  const rest = MODULES.filter((module) => !exclude.includes(module.key));

  return (
    <section className="py-14 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <div className="pub-eye mb-3">One platform</div>
          <h2 className="pub-display text-2xl md:text-3xl text-slate-900 dark:text-[#F5F1E8]">The rest of Club Rudder</h2>
          <p className="pub-muted max-w-2xl mx-auto mt-3">
            Every job below runs on the same system, sharing the same families, teams, facilities and ledgers.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rest.map((module) => (
            <Link key={module.key} to={MODULE_LINKS[module.key]} className="pub-card p-5 flex flex-col">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${module.iconBg}`}>
                <module.icon className={`w-5 h-5 ${module.iconText}`} />
              </div>
              <h3 className="font-extrabold text-base mb-1.5 text-slate-900 dark:text-[#F5F1E8]">{module.title}</h3>
              <p className="text-sm pub-muted leading-relaxed mb-3">{module.tagline}</p>
              <p className="text-xs pub-muted leading-relaxed flex-1">
                {module.features.map((feature) => feature.title).join(" · ")}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary mt-3">
                See the detail <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}