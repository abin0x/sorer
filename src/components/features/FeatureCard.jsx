import React from "react";
import { Check } from "lucide-react";

/** One feature card with a real app capture. */
export default function FeatureCard({ id, badge, title, job, bullets, shot, shotAlt }) {
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
      <div className="mt-auto overflow-hidden rounded-lg border border-border bg-background">
        <img src={shot} alt={shotAlt || `${title} in Club Rudder`} loading="lazy" width="1015" height="650" className="block aspect-[1015/650] w-full object-contain" />
      </div>
    </article>
  );
}