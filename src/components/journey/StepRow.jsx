import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowRight, Clock, MoreHorizontal, User, MapPin, LifeBuoy } from "lucide-react";
import { STEP_STATES } from "@/lib/journey/journeyConfig";

const SET_STATES = ["in_progress", "needs_review", "blocked", "done", "not_started"];

export default function StepRow({ step, data, canAct, canAssign, isLeftOff, onOpen, onState, onSkip, onAssign, onRequestHelp }) {
  const st = STEP_STATES[data.state];
  const resolved = ["done", "skipped", "deferred"].includes(data.state);
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${isLeftOff ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-semibold text-sm ${resolved ? "text-muted-foreground" : ""}`}>{step.title}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
            {isLeftOff && <span className="text-[11px] font-semibold text-primary flex items-center gap-1"><MapPin className="w-3 h-3" />You left off here</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{step.minutes} min</span>
            {data.assignee_email && (
              <span className="flex items-center gap-1"><User className="w-3 h-3" />Waiting on {data.assignee_name || data.assignee_email}</span>
            )}
          </div>
          {data.note && <p className="text-xs italic text-muted-foreground mt-1.5">"{data.note}"</p>}
          <button type="button" onClick={() => onRequestHelp?.(step)} className="text-xs text-primary/70 hover:text-primary underline mt-1.5 flex items-center gap-1">
            <LifeBuoy className="w-3 h-3" /> Request help
          </button>
        </div>
        {canAct && (
          <div className="flex items-center gap-1 shrink-0">
            {!resolved && (
              <Button size="sm" onClick={() => onOpen(step)} className="gap-1">
                {data.state === "not_started" ? "Start" : "Continue"} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Step options"><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {SET_STATES.filter((s) => s !== data.state).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => onState(step, s)}>Mark {STEP_STATES[s].label.toLowerCase()}</DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSkip(step, "skipped")}>Skip…</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSkip(step, "deferred")}>Defer…</DropdownMenuItem>
                {canAssign && <DropdownMenuItem onClick={() => onAssign(step)}>Assign to…</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}