import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutDashboard, ClipboardCheck, CreditCard, Users, Map, CalendarClock, Settings, ArrowRight, ShieldCheck, Wallet, UserPlus, BarChart3, Mail, Link2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { ROLES, hasPermission } from "@/lib/rbac";

// Map plugin keys to their primary settings/manage page
const PLUGIN_SETTINGS_MAP = {
  club_kanban: { url: "/Kanban", icon: LayoutDashboard, label: "Kanban Board", desc: "Programs, tasks, and project workflows" },
  club_nexus: { url: "/Registration", icon: ClipboardCheck, label: "Club Nexus", desc: "Branches, teams, players, and registrations" },
  payments: { url: "/Connections", icon: Link2, label: "Connections", desc: "Payment processors and accounting sync" },
  analytics: { url: "/Analytics", icon: BarChart3, label: "Analytics", desc: "Reports and club-wide metrics" },
  communications: { url: "/EmailTemplates", icon: Mail, label: "Communications", desc: "Email templates and scheduled reports" },
};

// Built-in settings modules always available to admins
const BUILTIN_SETTINGS = [
  { url: "/RBAC", icon: ShieldCheck, label: "Roles & Permissions", desc: "RBAC configuration per role", perm: "settings:view" },
  { url: "/UserPanel", icon: Users, label: "User Management", desc: "Invite and manage staff accounts", perm: "users:view" },
  { url: "/Locations", icon: Map, label: "Branches", desc: "Branch locations and facilities", perm: "branch:view" },
  { url: "/Settings", icon: Settings, label: "System Settings", desc: "App configuration and preferences", perm: "settings:view" },
  { url: "/Calendar", icon: CalendarClock, label: "Calendar", desc: "Program and event scheduling", perm: "program:view" },
  { url: "/Connections", icon: Link2, label: "Connections", desc: "Payment processors and accounting sync", perm: "finance:view" },
];

export default function ModuleSettingsNav({ user }) {
  const { data: plugins = [], isLoading } = useQuery({
    queryKey: ["plugins-settings-nav"],
    queryFn: () => base44.entities.Plugin.list("order", 50),
  });

  const activePlugins = plugins.filter((p) => p.is_active);

  // Build module cards from activated plugins
  const pluginCards = activePlugins
    .map((p) => {
      const mapped = PLUGIN_SETTINGS_MAP[p.key];
      if (!mapped) return null;
      return { ...mapped, pluginName: p.name, pluginKey: p.key, isPlugin: true };
    })
    .filter(Boolean);

  // Built-in settings the user can access
  const builtinCards = BUILTIN_SETTINGS.filter((s) => !s.perm || hasPermission(user, s.perm));

  const allCards = [...pluginCards, ...builtinCards];

  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (allCards.length === 0) return null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Module Settings</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">Quick access to settings for each activated module and plugin.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.url}
                className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{card.label}</p>
                    {card.isPlugin && <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1 py-0">PLUGIN</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{card.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}