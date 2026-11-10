import React, { useState } from "react";
import { AdisalCard, SectionLabel } from "@/components/adisal/ui";
import { Badge } from "@/components/ui/badge";
import { Shield, Sword, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  POSITION_GUIDE, POSITION_ORDER, RESPONSIBILITY_LABELS, JAGUAR_QUALITIES, GAME_PRIORITIES,
} from "./positionGuideData";

function JerseyIcon({ number, active, onClick, size = "md" }) {
  const dims = size === "sm" ? "w-9 h-9 text-xs" : "w-12 h-12 text-sm";
  return (
    <button
      onClick={onClick}
      className={`shrink-0 ${dims} rounded-md border-2 flex items-center justify-center font-extrabold transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/50"
      }`}
    >
      {number}
    </button>
  );
}

const PHASE_GROUPS = [
  { key: "defending", label: "Defending", icon: Shield, color: "text-blue-600", items: ["defending_organized", "defending_final_third", "defending_transition"] },
  { key: "attacking", label: "Attacking", icon: Sword, color: "text-primary", items: ["attacking_organized", "attacking_final_third", "attacking_transition"] },
];

// Standalone Position Guide — jersey-number selector + qualities + full responsibilities.
// Used both as the Knowledge Bank's default view and embedded in the player profile.
export default function PositionGuide({ initialPositionKey, compact = false }) {
  const [activeKey, setActiveKey] = useState(initialPositionKey || "goalkeeper");
  const pos = POSITION_GUIDE[activeKey];

  return (
    <div className="space-y-6">
      {!compact && (
        <AdisalCard className="p-5">
          <SectionLabel>Qualities of an Impactful Soccer Player</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {JAGUAR_QUALITIES.map((q) => (
              <div key={q.key} className="p-3 rounded-lg surface-tile">
                <p className="text-xs font-bold tracking-wide uppercase text-primary mb-1">{q.label}</p>
                <p className="text-xs text-muted-foreground">{q.text}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mr-2">Game Priorities</span>
            {GAME_PRIORITIES.map((g, i) => (
              <React.Fragment key={g}>
                <Badge className="bg-primary/15 text-primary border border-primary/30">{g}</Badge>
                {i < GAME_PRIORITIES.length - 1 && <span className="text-muted-foreground">›</span>}
              </React.Fragment>
            ))}
          </div>
        </AdisalCard>
      )}

      {/* Jersey selector */}
      <div>
        {!compact && <SectionLabel>Select a Position</SectionLabel>}
        <div className="flex items-center gap-2 flex-wrap">
          {POSITION_ORDER.map((key) => {
            const p = POSITION_GUIDE[key];
            return (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  activeKey === key ? "bg-primary/10 border-primary" : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="flex gap-1">
                  {p.numbers.map((n) => (
                    <JerseyIcon key={n} number={n} active={activeKey === key} size="sm" onClick={() => setActiveKey(key)} />
                  ))}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wide ${activeKey === key ? "text-primary" : "text-foreground"}`}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected position detail */}
      {pos && (
        <div className="space-y-5">
          {/* Priorities strip */}
          <div className="flex items-center gap-2 flex-wrap">
            {pos.priorities.map((pr, i) => (
              <React.Fragment key={pr}>
                <Badge className="bg-secondary text-secondary-foreground">{pr}</Badge>
                {i < pos.priorities.length - 1 && <span className="text-muted-foreground text-xs">›</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Traits & Qualities */}
          <AdisalCard className="p-5">
            <SectionLabel>{pos.label} — Traits & Qualities</SectionLabel>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pos.traits.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </AdisalCard>

          {/* Responsibilities — Defending / Attacking columns, each with 3 phases */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {PHASE_GROUPS.map((group) => (
              <AdisalCard key={group.key} className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <group.icon className={`w-4 h-4 ${group.color}`} />
                  <SectionLabel className="mb-0">{group.label} Responsibilities</SectionLabel>
                </div>
                <div className="space-y-4">
                  {group.items.map((phaseKey) => {
                    const items = pos.responsibilities[phaseKey];
                    if (!items?.length) return null;
                    return (
                      <div key={phaseKey}>
                        <p className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground mb-1.5">{RESPONSIBILITY_LABELS[phaseKey]}</p>
                        <ul className="space-y-1">
                          {items.map((it) => (
                            <li key={it} className="flex items-start gap-2 text-xs text-foreground">
                              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${group.key === "defending" ? "bg-blue-500" : "bg-primary"}`} />
                              {it}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </AdisalCard>
            ))}
          </div>

          {/* Technical Skill Checklist */}
          {pos.technicalChecklist && (
            <AdisalCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-4 h-4 text-primary" />
                <SectionLabel className="mb-0">Technical Skill Checklist</SectionLabel>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(pos.technicalChecklist).map(([group, items]) => (
                  <div key={group} className="p-3 rounded-lg surface-tile">
                    <p className="text-xs font-bold uppercase tracking-wide text-foreground mb-2">{group}</p>
                    <ul className="space-y-1">
                      {items.map((it) => (
                        <li key={it} className="text-xs text-muted-foreground">{it}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AdisalCard>
          )}
        </div>
      )}
    </div>
  );
}