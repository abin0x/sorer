import React from "react";

// Small building blocks for made-up "Demo FC" screens used in the walkthroughs.
export const Panel = ({ title, children, right }) => (
  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
    {(title || right) && (
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>{right}
      </div>
    )}
    {children}
  </div>
);

export const Stat = ({ label, value, note }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
    {note && <p className="text-xs text-status-success">{note}</p>}
  </div>
);

const TONES = {
  green: "bg-status-success/15 text-status-success",
  amber: "bg-status-warning/15 text-status-warning",
  red: "bg-status-danger/15 text-status-danger",
  blue: "bg-primary/10 text-primary",
};
export const Pill = ({ tone = "blue", children }) => (
  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
);

export const Row = ({ children }) => (
  <div className="flex items-center justify-between gap-3 border-t border-border py-2.5 text-sm first:border-t-0">{children}</div>
);

export const Btn = ({ children, ghost }) => (
  <span className={`inline-block rounded-lg px-4 py-2 text-sm font-semibold ${ghost ? "border border-border" : "bg-primary text-primary-foreground"}`}>{children}</span>
);

export const Field = ({ label, value }) => (
  <div>
    <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
    <div className="rounded-lg border border-input bg-background px-3 py-2 text-sm">{value}</div>
  </div>
);

export const Avatar = ({ name }) => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
    {name.split(" ").map((p) => p[0]).join("")}
  </span>
);
