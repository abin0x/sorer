import React, { useState } from "react";
import { Trophy, Plus, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PLATFORM_LIST, PLATFORM_GENDER_MAP } from "@/lib/tourDefaults";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function PlatformsStep({ platforms, setPlatforms, isLive }) {
  const [customName, setCustomName] = useState("");

  const toggle = (name) => {
    if (platforms.includes(name)) {
      setPlatforms(platforms.filter((p) => p !== name));
    } else {
      setPlatforms([...platforms, name]);
    }
  };

  const addCustom = () => {
    const trimmed = customName.trim();
    if (trimmed && !platforms.includes(trimmed)) {
      setPlatforms([...platforms, trimmed]);
      setCustomName("");
    }
  };

  return (
    <div className="space-y-5">
      <StepHeader
        icon={Trophy}
        title="Select your platforms & leagues"
        subtitle="Pick the competitive platforms your club participates in. We'll assign teams to these across both boys and girls."
      />

      <div className="flex flex-wrap gap-2">
        {PLATFORM_LIST.map((name) => {
          const selected = platforms.includes(name);
          const gender = PLATFORM_GENDER_MAP[name];
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all min-h-[44px] ${selected ? "text-white border-transparent" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
              style={selected ? { background: p(), borderColor: p() } : {}}
            >
              {selected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {name}
              {gender && gender !== "Boys and Girls" && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${selected ? "bg-white/20" : "bg-slate-100"}`}>
                  {gender === "Boys" ? "B" : "G"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom platform */}
      <div className="flex gap-2 pt-1">
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
          placeholder="Add a custom platform..."
          className="min-h-[44px] flex-1"
        />
        <button
          type="button"
          onClick={addCustom}
          className="inline-flex items-center gap-1.5 px-4 rounded-lg font-bold text-sm border-2 border-slate-200 text-slate-700 hover:border-slate-300 transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Selected custom platforms (removable) */}
      {platforms.filter((n) => !PLATFORM_LIST.includes(n)).length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {platforms.filter((n) => !PLATFORM_LIST.includes(n)).map((name) => (
            <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: p(0.1), color: p() }}>
              {name}
              <button type="button" onClick={() => toggle(name)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500 font-medium">
        {platforms.length} platform{platforms.length !== 1 ? "s" : ""} selected · {isLive ? "Saves when you continue." : "Sign up to save."}
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