import React from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, TrendingUp } from "lucide-react";
import { createPageUrl } from "@/utils";

const STAGES = [
  { key: "tryouts", label: "Tryouts Scheduled", link: "TryoutDashboard", color: "text-amber-600 bg-amber-50", dot: "bg-amber-500" },
  { key: "tryoutRegs", label: "Player Signups", link: "TryoutSignup", color: "text-cyan-600 bg-cyan-50", dot: "bg-cyan-500" },
  { key: "registrations", label: "Registrations", link: "Registration", color: "text-indigo-600 bg-indigo-50", dot: "bg-indigo-500" },
];

export default function PipelineOverview({ counts }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Tryout Pipeline
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Teams form through tryouts — from signup to enrollment</p>
          </div>
          <Link to={createPageUrl("TryoutDashboard")} className="text-sm text-blue-600 font-medium hover:underline flex items-center">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex items-center gap-1 lg:gap-2 overflow-x-auto">
          {STAGES.map((stage, idx) => (
            <React.Fragment key={stage.key}>
              <Link to={createPageUrl(stage.link)} className="flex-1 min-w-[100px]">
                <div className={`p-3 rounded-xl ${stage.color} text-center hover:shadow-sm transition-shadow`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.dot} mx-auto mb-1.5`} />
                  <p className="text-2xl font-bold text-slate-800">{counts[stage.key] || 0}</p>
                  <p className="text-xs font-medium text-slate-600 mt-0.5 leading-tight">{stage.label}</p>
                </div>
              </Link>
              {idx < STAGES.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}