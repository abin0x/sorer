import React from "react";
import { Check } from "lucide-react";

/** One feature card: badge, title, job line, four bullets and a screenshot slot. */
export default function FeatureCard({ id, badge, title, job, bullets, shot }) {
  return (
    <article id={id} className="pub-card p-6 flex flex-col scroll-mt-24">
      <span className="self-start text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary mb-3">
        {badge}
      </span>
      <h3 className="text-xl font-extrabold mb-2">{title}</h3>
      <p className="text-sm pub-muted mb-4">{job}</p>
      <ul className="space-y-2 mb-5">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 text-sm text-slate-700 dark:text-[#cfcabd]">
            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div
        role="img"
        aria-label={`Screenshot placeholder for ${title}`}
        className="mt-auto rounded-xl border border-dashed border-slate-300 dark:border-[#3a4a43] bg-slate-50 dark:bg-[#0d1311] min-h-[140px] flex items-center justify-center text-center px-4 py-6"
      >
        <span className="text-xs font-semibold pub-muted">{shot}</span>
      </div>
    </article>
  );
}