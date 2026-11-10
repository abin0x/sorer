import React from "react";
import { Building2, CheckCircle2, PauseCircle, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TenantStatsRow({ clubs, branchCount }) {
  const stats = [
    { icon: Building2, label: "Tenants", value: clubs.filter((c) => c.status !== "archived").length, tone: "indigo" },
    { icon: CheckCircle2, label: "Active", value: clubs.filter((c) => c.status === "active" || c.status === "trialing").length, tone: "emerald" },
    { icon: PauseCircle, label: "Suspended", value: clubs.filter((c) => c.status === "suspended").length, tone: "amber" },
    { icon: GitBranch, label: "Branches", value: branchCount, tone: "cyan" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONE_MAP[s.tone]}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const TONE_MAP = {
  indigo: "bg-indigo-100 text-indigo-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  cyan: "bg-cyan-100 text-cyan-700",
};