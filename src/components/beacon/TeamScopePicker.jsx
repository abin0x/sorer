import React, { useState } from "react";
import { Users, Check } from "lucide-react";
import NativeSheet from "./NativeSheet";

/** Chip that opens a bottom sheet to choose which teams show in chat and calendar. */
export default function TeamScopePicker({ teams, selected, onChange }) {
  const [open, setOpen] = useState(false);
  if (teams.length < 2) return null;
  const label = !selected.length ? "All my teams" : selected.length === 1 ? (teams.find((t) => t.id === selected[0])?.name || "1 team") : `${selected.length} teams`;
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium max-w-full min-h-[40px]">
        <Users className="w-4 h-4 text-primary shrink-0" /><span className="truncate">{label}</span>
      </button>
      <NativeSheet open={open} onClose={() => setOpen(false)} title="Show teams">
        <p className="text-sm text-muted-foreground mb-3">Pick the teams whose chat and calendar you want to see.</p>
        <button onClick={() => onChange([])} className={`w-full flex items-center justify-between rounded-xl px-4 py-3 mb-2 font-semibold ${!selected.length ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          All my teams {!selected.length && <Check className="w-5 h-5" />}
        </button>
        <div className="space-y-1">
          {teams.map((t) => {
            const on = selected.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggle(t.id)} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left active:bg-muted">
                <span className={`w-6 h-6 rounded-md border-2 grid place-items-center ${on ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>{on && <Check className="w-4 h-4" />}</span>
                <span className="flex-1 truncate font-medium">{t.name}</span>
                {t.age_group && <span className="text-xs text-muted-foreground">{t.age_group}</span>}
              </button>
            );
          })}
        </div>
        <button onClick={() => setOpen(false)} className="mt-3 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">Done</button>
      </NativeSheet>
    </>
  );
}
