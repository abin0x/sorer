import React from "react";
import { Check } from "lucide-react";

const STEPS = ["Club Identity", "Structure", "Modules", "Migration"];

export default function WizardProgressBar({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < currentStep;
        const active = stepNum === currentStep;
        return (
          <React.Fragment key={label}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              done ? "bg-emerald-100 text-emerald-700" : active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
            }`}>
              {done ? <Check className="w-3.5 h-3.5" /> : <span>{stepNum}.</span>}
              {label}
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-slate-300" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}