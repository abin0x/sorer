import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ===== Tenet colors =====
export const TENET_COLORS = {
  explosive: { bg: "#E8574B", light: "#FEEFED", label: "EXPLOSIVE" },
  precise: { bg: "#5865F2", light: "#EEF0FE", label: "PRECISE" },
  insightful: { bg: "#43B581", light: "#EAF7F0", label: "INSIGHTFUL" },
  combative: { bg: "#E67E22", light: "#FEF3E8", label: "COMBATIVE" },
};

export const LEVEL_COLORS = {
  beginner: { bg: "#43B581", light: "#EAF7F0", label: "BEGINNER" },
  intermediate: { bg: "#5865F2", light: "#EEF0FE", label: "INTERMEDIATE" },
  advanced: { bg: "#D97706", light: "#FEF3E8", label: "ADVANCED" },
  expert: { bg: "#7C3AED", light: "#F3EEFE", label: "EXPERT" },
};

export function TenetBadge({ tenet, className }) {
  const c = TENET_COLORS[tenet];
  if (!c) return null;
  return (
    <span
      className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase", className)}
      style={{ background: c.bg, color: "#fff" }}
    >
      {c.label}
    </span>
  );
}

export function LevelBadge({ level, className }) {
  const c = LEVEL_COLORS[level];
  if (!c) return null;
  return (
    <span
      className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border", className)}
      style={{ background: c.light, color: c.bg, borderColor: c.bg + "33" }}
    >
      {c.label}
    </span>
  );
}

// ===== Page header with breadcrumb =====
export function AdisalPageHeader({ breadcrumb, title, titleAccent, subtitle, actions }) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <div className="text-xs font-semibold tracking-wider uppercase text-primary mb-2">{breadcrumb}</div>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {title} {titleAccent && <span className="text-primary">{titleAccent}</span>}
          </h1>
          {subtitle && <p className="text-muted-foreground mt-1.5 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

export function BackLink({ to, label = "BACK" }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase text-muted-foreground hover:text-foreground mb-3">
      <ArrowLeft className="w-3.5 h-3.5" /> {label}
    </Link>
  );
}

// ===== Tabs (underlined active state) =====
export function AdisalTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-6 border-b border-border mb-6">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "pb-3 text-sm font-semibold tracking-wide uppercase transition-colors -mb-px border-b-2",
            active === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ===== Filter pill button =====
export function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

// ===== Card wrapper =====
export function AdisalCard({ className, children, ...props }) {
  return (
    <div className={cn("bg-card border border-border rounded-lg transition-colors hover:border-primary/40", className)} {...props}>
      {children}
    </div>
  );
}

// ===== Section label =====
export function SectionLabel({ children, className }) {
  return <div className={cn("text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3", className)}>{children}</div>;
}