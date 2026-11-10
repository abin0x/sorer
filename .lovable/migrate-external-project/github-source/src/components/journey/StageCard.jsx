import React from "react";
import { Check, ChevronDown } from "lucide-react";
import { stageProgress, stepOf } from "@/lib/journey/journeyConfig";
import StepRow from "@/components/journey/StepRow";
import StageAProfile from "@/components/journey/StageAProfile";
import StageCPanel from "@/components/journey/StageCPanel";
import StageDPanel from "@/components/journey/StageDPanel";

/** One stage. Collapsed to a summary line unless it is the open stage. */
export default function StageCard({ stage, journey, club, open, onToggle, me, canEdit, profileOpen, handlers, saving, onSaved }) {
  const { done, total, complete } = stageProgress(journey, stage);
  return (
    <div className={`rounded-2xl border bg-card ${open ? "border-primary/40 shadow-sm" : "border-border"}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${complete ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"}`}>
          {complete ? <Check className="w-4 h-4" /> : stage.id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{stage.name}</div>
          <div className="text-xs text-muted-foreground">{done} of {total} done · {stage.time}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {stage.steps.map((step) => {
            const data = stepOf(journey, step.key);
            const canAct = canEdit || (data.assignee_email && data.assignee_email === me?.email?.toLowerCase());
            return (
              <React.Fragment key={step.key}>
                <StepRow
                  step={step} data={data} canAct={canAct} canAssign={canEdit}
                  isLeftOff={journey.last_step_key === step.key && data.state !== "done"}
                  {...handlers}
                />
                {step.kind === "profile" && profileOpen && canEdit && (
                  <StageAProfile club={club} journey={journey} saving={saving} onSave={handlers.onSaveProfile} onDraft={handlers.onDraft} />
                )}
              </React.Fragment>
            );
          })}
          {stage.panel === "season" && <StageCPanel clubId={club?.id} journey={journey} canEdit={canEdit} onSaved={onSaved} />}
          {stage.panel === "go_live" && <StageDPanel clubId={club?.id} journey={journey} canEdit={canEdit} onSaved={onSaved} />}
        </div>
      )}
    </div>
  );
}