import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Users, ClipboardList, Shield, DollarSign, TrendingUp, Clock } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function ClubOverview({ onRegister }) {
  const { data: players = [] } = useQuery({ queryKey: ["players-list"], queryFn: () => base44.entities.Player.list("-created_date", 200) });
  const { data: registrations = [] } = useQuery({ queryKey: ["registrations", "all"], queryFn: () => base44.entities.Registration.list("-created_date", 100) });
  const { data: teams = [] } = useQuery({ queryKey: ["teams-list"], queryFn: () => base44.entities.Team.list("-created_date", 100) });

  const pending = registrations.filter((r) => r.status === "pending").length;
  const active = players.filter((p) => p.status === "active").length;
  const paid = registrations.filter((r) => r.payment_status === "paid").length;
  const revenue = registrations.filter((r) => r.payment_status === "paid").reduce((s, r) => s + (r.amount_paid || 0), 0);

  const stats = [
    { label: "Active Players", value: active, icon: Users, color: "from-emerald-500 to-emerald-700" },
    { label: "Pending Registrations", value: pending, icon: Clock, color: "from-amber-500 to-amber-600" },
    { label: "Teams", value: teams.length, icon: Shield, color: "from-blue-500 to-blue-700" },
    { label: "Paid Registrations", value: paid, icon: ClipboardList, color: "from-purple-500 to-purple-700" },
  ];

  const recent = registrations.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Registration Revenue</h3>
            </div>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">${revenue.toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">From {paid} paid registration(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Recent Registrations</h3>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No registrations yet.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    {r.player_id ? (
                      <Link to={`${createPageUrl("PlayerDetail")}?id=${r.player_id}`} className="truncate text-blue-600 dark:text-blue-400 hover:underline">{r.player_name}</Link>
                    ) : (
                      <span className="truncate text-slate-700 dark:text-slate-300">{r.player_name}</span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate ml-2">{r.program_title}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}