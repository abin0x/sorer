import React from "react";
import { Link } from "react-router-dom";

// Standardized dashboard header with role label, welcome, and primary question
export default function DashboardHeader({ roleLabel, userName, primaryQuestion, subtitle, accent = "#399F7D" }) {
  return (
    <div className="mb-6">
      <div className="text-xs font-bold tracking-wider uppercase mb-1" style={{ color: accent }}>
        {roleLabel}
      </div>
      <h1 className="text-2xl font-extrabold text-text-primary">
        Welcome back, {userName?.split(" ")[0] || "there"}
      </h1>
      {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      {primaryQuestion && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-neutral-50 border border-border-subtle">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide shrink-0">Primary Question</span>
          <p className="text-sm text-text-primary font-medium">{primaryQuestion}</p>
        </div>
      )}
    </div>
  );
}