import React from "react";
import { Check, Plus, Star } from "lucide-react";
import { MODULES } from "@/components/features/moduleData";

// Maps pricing-calculator module keys → rich home-page module entries.
const MODULE_KEY_MAP = {
  payments: "payments",
  website: "branding",
  player_dev: "development",
  facilities: "facilities",
  tournaments: "tournaments",
  kanban: "kanban",
};

// Strategic purchase order (most-wanted first).
const ORDER = ["payments", "website", "player_dev", "facilities", "tournaments", "kanban"];

// Benefit-driven copy: headline sells the outcome, bullets explain how.
// Every module now carries a badge so the grid reads consistently.
const BENEFITS = {
  payments: {
    headline: "Sell more. Stay in balance.",
    bullets: [
      "Marketplace, events & spiritwear store",
      "Staff expense reports with receipts & approvals",
      "Two-way QuickBooks sync & invoicing",
      "Audit-ready books across branches",
    ],
    tag: "Storefront and bookkeeping on top of club dues payments",
    badge: "Online Marketplace",
  },
  website: {
    headline: "Look professional. Get found. Grow faster.",
    bullets: [
      "A branded club website built in",
      "Automated social campaigns",
      "Marketing analytics in one dashboard",
      "Email templates and lead-capture pages",
    ],
    tag: "Grow your club membership",
    badge: "Brag to the World",
  },
  player_dev: {
    headline: "Turn potential into performance.",
    bullets: [
      "Track player growth and goals",
      "E.P.I.C. evaluations and coach feedback",
      "Video, training plans, and attendance",
      "Skill testing, benchmarks, and physical assessments",
    ],
    tag: "Player-centric development tools",
    badge: "Development Pathways",
  },
  facilities: {
    headline: "Never double-book a field again.",
    bullets: [
      "Manage bookings, maintenance, and availability",
      "Calendar and field-grid views",
      "Recurring weekly slots across the season",
      "Utilization analytics and booking alerts",
    ],
    tag: "Maximize your facilities and fields usage",
    badge: "Your Home In Order",
  },
  tournaments: {
    headline: "Run tournaments that run themselves.",
    bullets: [
      "Registration, brackets, and scheduling",
      "Referee assignments and availability",
      "Auto-created game-day tasks",
      "Field assignment and conflict-free scheduling",
    ],
    tag: "Host bigger, more profitable events",
    badge: "Events, Automated",
  },
  kanban: {
    headline: "Run your club like a well-oiled machine.",
    bullets: [
      "Assign tasks and track progress",
      "RACI staff assignments and priorities",
      "Dependencies, timelines, and roadmaps",
      "AI task breakdown and budget forecasting",
    ],
    tag: "Foster accountability and efficiency",
    badge: "Fortune 500 OPS",
  },
};

export default function ModuleCardGrid({ modules, selectedKeys, onToggle }) {
  // Sort modules into strategic purchase order.
  const ordered = [...modules].sort((a, b) => {
    const ai = ORDER.indexOf(a.key);
    const bi = ORDER.indexOf(b.key);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ordered.map((m) => {
        const checked = selectedKeys.includes(m.key);
        const rich = MODULES.find((r) => r.key === MODULE_KEY_MAP[m.key]);
        const benefit = BENEFITS[m.key] || {};
        const monthly = Math.round((Number(m.list_price) || 0) / 12);
        const Icon = rich?.icon;

        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onToggle(m.key)}
            className={`relative text-left flex flex-col p-5 rounded-2xl border-2 transition-all duration-200 ${
              checked
                ? "border-transparent shadow-lg"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
            }`}
            style={checked ? { borderColor: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.04)" } : {}}
          >
            {benefit.badge && (
              <span
                className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                style={{ background: "hsl(var(--primary))" }}
              >
                {benefit.badge === "Most Added" && <Star className="w-2.5 h-2.5 fill-white" />}
                {benefit.badge}
              </span>
            )}

            <div className="flex items-start gap-3 mb-3">
              {Icon && (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${rich?.iconBg || "bg-slate-100"}`}>
                  <Icon className={`w-5 h-5 ${rich?.iconText || "text-slate-600 dark:text-slate-300"}`} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{m.name}</p>
                {benefit.headline && (
                  <p className="text-xs font-semibold mt-0.5" style={{ color: "hsl(var(--primary))" }}>{benefit.headline}</p>
                )}
              </div>
            </div>

            {benefit.bullets && (
              <ul className="space-y-1.5 mb-4 flex-1">
                {benefit.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm">${Number(m.list_price).toLocaleString()}<span className="font-medium text-slate-400 text-xs">/yr</span></p>
                <p className="text-[11px] text-slate-400">about ${monthly}/mo, billed annually</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  checked ? "text-white" : "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"
                }`}
                style={checked ? { background: "hsl(var(--primary))" } : {}}
              >
                {checked ? <><Check className="w-3.5 h-3.5" /> Added</> : <><Plus className="w-3.5 h-3.5" /> Add</>}
              </span>
            </div>

            {benefit.tag && (
              <p className="text-[11px] font-medium text-slate-400 mt-3">{benefit.tag}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}