import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ListChecks, Users, CalendarCheck, UserPlus,
  ClipboardCheck, MailCheck, CreditCard, ArrowRight, CheckCircle2, Lock
} from "lucide-react";
import { createPageUrl } from "@/utils";

const STEPS = [
  {
    id: "locations",
    label: "Create Locations",
    desc: "Set up your club locations / branches",
    icon: Building2,
    link: "Locations",
    countKey: "locations",
  },
  {
    id: "programs",
    label: "Create Programs",
    desc: "Add seasonal programs per location",
    icon: ListChecks,
    link: "ProgramsList",
    countKey: "programs",
  },
  {
    id: "teams",
    label: "Create Teams",
    desc: "Build teams for the season & assign coaches",
    icon: Users,
    link: "Registration",
    countKey: "teams",
  },
  {
    id: "tryouts",
    label: "Schedule Tryouts",
    desc: "Set tryout dates for each team / age group",
    icon: CalendarCheck,
    link: "TryoutDashboard",
    countKey: "tryouts",
  },
  {
    id: "signups",
    label: "Player Signups",
    desc: "Players sign up for tryouts (creates records)",
    icon: UserPlus,
    link: "TryoutSignup",
    countKey: "tryoutRegs",
  },
  {
    id: "enroll",
    label: "Enroll & Collect Dues",
    desc: "Process paperwork, payments & roster",
    icon: CreditCard,
    link: "Registration",
    countKey: "registrations",
  },
];

export default function WorkflowChecklist({ counts }) {
  const getStepState = (step, idx) => {
    const count = counts[step.countKey] || 0;
    const prevStep = idx > 0 ? STEPS[idx - 1] : null;
    const prevDone = !prevStep || (counts[prevStep.countKey] || 0) > 0;
    if (count > 0) return "done";
    if (prevDone) return "active";
    return "locked";
  };

  const doneCount = STEPS.filter((s, i) => getStepState(s, i) === "done").length;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Season Setup Checklist</h2>
            <p className="text-sm text-slate-500 mt-0.5">Create teams → schedule tryouts → sign up players → enroll</p>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {doneCount} / {STEPS.length} complete
          </Badge>
        </div>

        {/* Desktop horizontal stepper */}
        <div className="hidden lg:flex items-start gap-1 overflow-x-auto pb-2">
          {STEPS.map((step, idx) => {
            const state = getStepState(step, idx);
            const Icon = step.icon;
            const stepBody = (
              <div className="flex flex-col items-center text-center flex-1">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 transition-all ${
                    state === "done"
                      ? "bg-emerald-500 text-white"
                      : state === "active"
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {state === "done" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : state === "locked" ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <p className={`text-xs font-semibold leading-tight ${state === "locked" ? "text-slate-400" : "text-slate-700"}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{step.desc}</p>
                {(counts[step.countKey] || 0) > 0 && (
                  <Badge variant="secondary" className="mt-1 text-[10px] bg-emerald-50 text-emerald-700">
                    {counts[step.countKey]} created
                  </Badge>
                )}
              </div>
            );
            return (
              <div key={step.id} className="flex items-start flex-1 min-w-[130px]">
                {state === "locked" ? (
                  stepBody
                ) : (
                  <Link to={createPageUrl(step.link)} className="flex-1 hover:opacity-80 transition-opacity">
                    {stepBody}
                  </Link>
                )}
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mt-5 mx-1 rounded-full ${state === "done" ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile vertical stepper */}
        <div className="lg:hidden space-y-2">
          {STEPS.map((step, idx) => {
            const state = getStepState(step, idx);
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    state === "done"
                      ? "bg-emerald-500 text-white"
                      : state === "active"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {state === "done" ? <CheckCircle2 className="w-4 h-4" /> : state === "locked" ? <Lock className="w-3.5 h-3.5" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${state === "locked" ? "text-slate-400" : "text-slate-700"}`}>{step.label}</p>
                  <p className="text-xs text-slate-400 truncate">{step.desc}</p>
                </div>
                {state !== "locked" && (
                  <Button asChild size="sm" variant={state === "done" ? "outline" : "default"} className="shrink-0">
                    <Link to={createPageUrl(step.link)}>
                      {state === "done" ? "Manage" : "Start"} <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}