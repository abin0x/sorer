import React from "react";
import { Check } from "lucide-react";

/**
 * Renders an article body from its structured sections: paragraphs, numbered
 * steps (optionally with bullets) and plain bullet lists. Headings become real
 * H2s so the article has a crawlable outline.
 */
export default function ArticleBody({ sections }) {
  return (
    <div className="space-y-12">
      {sections.map((section, index) => (
        <section key={section.heading || index}>
          {section.heading && (
            <h2 className="pub-display text-xl md:text-2xl mb-5 text-slate-900 dark:text-[#F5F1E8]">
              {section.heading}
            </h2>
          )}

          {section.type === "paragraphs" &&
            section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 30)} className="text-base pub-muted mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}

          {section.type === "steps" && (
            <ol className="space-y-5">
              {section.steps.map((step, stepIndex) => (
                <li key={step.title} className="pub-card p-5 md:p-6">
                  <div className="flex items-start gap-3">
                    <span
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold text-primary"
                      style={{ background: "hsl(var(--primary) / 0.12)" }}
                    >
                      {stepIndex + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-base md:text-lg mb-1.5 text-slate-900 dark:text-[#F5F1E8]">
                        {step.title}
                      </h3>
                      <p className="text-sm md:text-base pub-muted leading-relaxed">{step.body}</p>
                      {step.bullets?.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {step.bullets.map((bullet) => (
                            <li key={bullet.slice(0, 30)} className="flex items-start gap-2 text-sm pub-muted">
                              <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {section.type === "bullets" && (
            <ul className="space-y-2.5">
              {section.bullets.map((bullet) => (
                <li key={bullet.slice(0, 30)} className="flex items-start gap-2 text-sm md:text-base pub-muted">
                  <Check className="w-4 h-4 mt-1 shrink-0 text-emerald-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}