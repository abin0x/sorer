import React from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ListChecks, Users, CalendarCheck, ClipboardCheck,
  MailCheck, CreditCard, UserPlus,
} from "lucide-react";
import { createPageUrl } from "@/utils";

const ACTIONS = [
  {
    label: "Add Location",
    desc: "Create a new club location or branch",
    icon: Building2,
    link: "Locations",
    iconBg: "bg-blue-500",
    cardColor: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    label: "Add Program",
    desc: "Create a seasonal program",
    icon: ListChecks,
    link: "ProgramsList",
    iconBg: "bg-violet-500",
    cardColor: "bg-violet-50 text-violet-600 border-violet-200",
  },
  {
    label: "Add Team",
    desc: "Build a team & assign coaches",
    icon: Users,
    link: "Registration",
    iconBg: "bg-emerald-500",
    cardColor: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  {
    label: "Plan Tryouts",
    desc: "Tryout planner & task board",
    icon: CalendarCheck,
    link: "TryoutDashboard",
    iconBg: "bg-amber-500",
    cardColor: "bg-amber-50 text-amber-600 border-amber-200",
  },
  {
    label: "Process Registrations",
    desc: "Approve, collect dues & roster",
    icon: CreditCard,
    link: "Registration",
    iconBg: "bg-indigo-500",
    cardColor: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
];

export default function QuickActions({ badges = {} }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
            <p className="text-sm text-slate-500 mt-0.5">Jump straight to any task</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const badge = badges[action.link];
            return (
              <Link
                key={action.label}
                to={createPageUrl(action.link)}
                className={`group relative p-4 rounded-xl border ${action.cardColor} hover:shadow-md transition-all hover:-translate-y-0.5`}
              >
                {badge > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0 min-w-[20px] justify-center">
                    {badge}
                  </Badge>
                )}
                <div className={`w-9 h-9 ${action.iconBg} rounded-lg flex items-center justify-center mb-2.5`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-semibold text-sm text-slate-800 leading-tight">{action.label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-tight">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}