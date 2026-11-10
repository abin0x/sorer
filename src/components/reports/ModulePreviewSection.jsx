import React from "react";
import { Lock, MapPin, Trophy, ShoppingBag, Activity, LayoutDashboard, ArrowRight } from "lucide-react";

const MODULE_PREVIEWS = [
  {
    key: "facility_management",
    name: "Facilities",
    icon: MapPin,
    description: "Field utilization, booking summaries, and game-day scheduling reports.",
    reports: ["Field Utilization", "Game Schedule Summary"],
    tiles: ["Field utilization %", "Bookings per week", "Game count by field"],
  },
  {
    key: "tournaments",
    name: "Tournaments",
    icon: Trophy,
    description: "Tournament registration revenue, team summaries, and standings.",
    reports: ["Tournament Revenue", "Tournament Standings"],
    tiles: ["Registration revenue", "Teams registered", "Divisions filled"],
  },
  {
    key: "marketplace",
    name: "Marketplace",
    icon: ShoppingBag,
    description: "Marketplace sales, spiritwear orders, and subscription revenue.",
    reports: ["Marketplace Sales", "Spiritwear Orders"],
    tiles: ["Total sales", "Orders this month", "Top products"],
  },
  {
    key: "player_development",
    name: "Player Development",
    icon: Activity,
    description: "Player evaluation history, skill test results, and development tracking.",
    reports: ["Player Evaluations", "Skill Test Results"],
    tiles: ["Evaluations completed", "Avg skill score", "Players assessed"],
  },
  {
    key: "kanban",
    name: "Kanban & Programs",
    icon: LayoutDashboard,
    description: "Program status summaries, task completion rates, and project health.",
    reports: ["Program Status Summary", "Task Completion"],
    tiles: ["Active programs", "Tasks completed", "Overdue tasks"],
  },
];

/**
 * Shows locked preview cards for add-on modules the club hasn't subscribed to.
 * Subscribed modules' reports appear in the report library instead.
 * props: { hasModule }
 */
export default function ModulePreviewSection({ hasModule }) {
  const locked = MODULE_PREVIEWS.filter((m) => !hasModule(m.key));

  if (locked.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Add-on Module Reports
        </h3>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        These modules add their own reports and dashboard tiles. Subscribe to unlock them.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {locked.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.key}
              className="relative p-4 rounded-xl border bg-card overflow-hidden min-h-[160px]"
            >
              <div className="absolute top-3 right-3">
                <Lock className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{m.name}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{m.description}</p>
              <div className="space-y-1">
                {m.reports.map((r) => (
                  <div key={r} className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                    <ArrowRight className="w-3 h-3" />
                    {r}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}