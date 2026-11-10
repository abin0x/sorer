import React from "react";

/**
 * One deep-dive section (payments, accounting, migration, multi-branch):
 * Club Rudder facts, then an explicit placeholder for the competitor detail
 * that still has to be fact-checked.
 */
export default function CompareSection({ section, competitor }) {
  return (
    <div className="pub-card p-6 md:p-8">
      <h2 className="pub-display text-xl md:text-2xl mb-3 text-slate-900 dark:text-[#F5F1E8]">{section.heading}</h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 30)} className="text-sm md:text-base pub-muted mb-3 last:mb-0 leading-relaxed">
          {paragraph}
        </p>
      ))}
      <div className="mt-5 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 p-3">
        <p className="text-xs md:text-sm font-semibold text-amber-900 dark:text-amber-200">
          [VERIFY: {competitor} {section.verifyLabel}] — add the fact-checked detail here before this page goes live.
        </p>
      </div>
    </div>
  );
}