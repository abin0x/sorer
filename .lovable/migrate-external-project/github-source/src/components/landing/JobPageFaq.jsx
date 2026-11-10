import React from "react";

/** Short FAQ for a job landing page — the same questions its FAQ schema declares. */
export default function JobPageFaq({ faqs }) {
  return (
    <section className="py-14 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="pub-display text-2xl md:text-3xl mb-7 text-center text-slate-900 dark:text-[#F5F1E8]">
          Questions directors ask
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="pub-card p-5">
              <h3 className="font-bold text-base mb-1.5 text-slate-900 dark:text-[#F5F1E8]">{faq.q}</h3>
              <p className="text-sm pub-muted leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}