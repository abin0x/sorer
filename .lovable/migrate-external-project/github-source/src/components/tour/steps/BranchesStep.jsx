import React from "react";
import { GitBranch, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function BranchesStep({ branchNames, setBranchNames, isLive }) {
  const update = (i, val) => setBranchNames(branchNames.map((n, j) => (j === i ? val : n)));
  const add = () => setBranchNames([...branchNames, ""]);
  const remove = (i) => {
    if (branchNames.length <= 1) return;
    setBranchNames(branchNames.filter((_, j) => j !== i));
  };

  return (
    <div className="space-y-5">
      <StepHeader
        icon={GitBranch}
        title="Customize your branches"
        subtitle="Your club starts with 3 branches. Rename them to match your real locations — you can add or remove later."
      />

      <div className="space-y-3">
        {branchNames.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: i === 0 ? p() : "hsl(220 14% 94%)" }}>
              <GitBranch className="w-4 h-4" style={{ color: i === 0 ? "white" : "hsl(220 14% 45%)" }} />
            </div>
            <Input
              value={name}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Branch ${i + 1} name`}
              className="min-h-[44px] flex-1"
            />
            {branchNames.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="shrink-0 text-slate-400 hover:text-red-500" onClick={() => remove(i)}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {branchNames.length < 6 && (
        <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-bold hover:opacity-80" style={{ color: p() }}>
          <Plus className="w-4 h-4" /> Add another branch
        </button>
      )}

      <p className="text-xs text-slate-500 font-medium">
        {isLive ? "Changes save automatically when you continue." : "Sign up to save your branches."}
      </p>
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: p(0.12) }}>
        <Icon className="w-5 h-5" style={{ color: p() }} />
      </div>
      <div>
        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}