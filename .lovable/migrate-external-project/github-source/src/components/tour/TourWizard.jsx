import React from "react";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { TOUR_STEPS } from "@/lib/tourDefaults";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

const STEP_ICONS = {
  Home: "Home", GitBranch: "GitBranch", Trophy: "Trophy",
  CalendarClock: "CalendarClock", PartyPopper: "PartyPopper",
};

// Wizard panel shell — progress indicator, step content, navigation.
// Renders as a right-side panel on desktop, bottom sheet on mobile.
export default function TourWizard({
  step, totalSteps, isLive, persisting,
  canAdvance, onNext, onBack, onStartTrial, children,
}) {
  const isLast = step === totalSteps - 1;

  return (
    <div className="bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Progress indicator */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          {TOUR_STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                style={{
                  background: i <= step ? p() : "hsl(220 14% 92%)",
                  color: i <= step ? "white" : "hsl(220 14% 55%)",
                }}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < TOUR_STEPS.length - 1 && (
                <div className="h-0.5 flex-1 mx-1 rounded-full transition-all" style={{ background: i < step ? p() : "hsl(220 14% 92%)" }} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {TOUR_STEPS.map((s, i) => (
            <span key={s.key} className={`text-xs font-semibold ${i === step ? "" : "text-slate-400"}`} style={i === step ? { color: p() } : {}}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-5">
        {children}
      </div>

      {/* Navigation */}
      {!isLast && (
        <div className="p-5 border-t border-slate-200 space-y-3">
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={onBack}
                disabled={persisting}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors min-h-[44px] disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button
              onClick={onNext}
              disabled={persisting || !canAdvance}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90 min-h-[44px] disabled:opacity-50"
              style={{ background: p() }}
            >
              {persisting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}