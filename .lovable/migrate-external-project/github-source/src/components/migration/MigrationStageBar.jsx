import React from "react";
import { Check, FileUp, Cog, UserCheck, Rocket, ShieldCheck, Wrench } from "lucide-react";

const STAGES = [
  { key: "pending_approval", label: "Approval", icon: ShieldCheck },
  { key: "draft", label: "Prepare & Upload", icon: FileUp },
  { key: "processing", label: "Auto-Map", icon: Cog },
  { key: "client_review", label: "Your Review", icon: Wrench },
  { key: "support_review", label: "Human Review", icon: UserCheck },
  { key: "completed", label: "Go Live", icon: Rocket },
];

const ORDER = ["pending_approval", "draft", "processing", "client_review", "support_review", "needs_fixes", "completed"];

export default function MigrationStageBar({ status }) {
  const effectiveIndex = ORDER.indexOf(status === "needs_fixes" ? "draft" : status);

  return (
    <div className="flex items-center justify-between">
      {STAGES.map((stage, i) => {
        const stageIndex = ORDER.indexOf(stage.key);
        const done = stageIndex < effectiveIndex || status === "completed";
        const active = stageIndex === effectiveIndex && status !== "completed";
        const Icon = stage.icon;
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  done ? "bg-primary border-primary text-white" : active ? "border-primary text-primary" : "border-slate-200 text-slate-400"
                }`}
              >
                {done ? <Check className="w-5 h-5" /> : <Icon className="w-4.5 h-4.5" />}
              </div>
              <span className={`text-xs font-semibold text-center ${active || done ? "text-slate-900" : "text-slate-400"}`}>{stage.label}</span>
            </div>
            {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 -mt-6 ${done ? "bg-primary" : "bg-slate-200"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}