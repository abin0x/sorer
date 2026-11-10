import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Calendar } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import BookDemoDialog from "@/components/public/BookDemoDialog";
import NoIndex from "@/components/seo/NoIndex";
import JsonLd from "@/components/seo/JsonLd";
import ComparisonTable from "@/components/compare/ComparisonTable";
import CompareSection from "@/components/compare/CompareSection";
import usePageMeta from "@/lib/usePageMeta";
import { faqPageSchema } from "@/lib/seo/structuredData";
import { COMPARE_FAQS, COMPARE_SECTIONS, COMPARE_TABLE_ROWS } from "@/lib/compare/comparePages";

const FAQ_SCHEMA = faqPageSchema(COMPARE_FAQS);

/**
 * Shared layout for the three /compare/* pages. Same structure on each, with
 * the competitor name swapped in — and noindex while the [VERIFY] facts are
 * still open, so the page is reachable for review but never published.
 */
export default function ComparePage({ data }) {
  const [demoOpen, setDemoOpen] = useState(false);

  usePageMeta({ title: data.metaTitle, description: data.metaDescription });

  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <NoIndex />
      <JsonLd id="ld-compare-faq" data={FAQ_SCHEMA} />
      <PublicNav />

      {/* Draft strip — visible until the placeholders are verified */}
      <div className="border-b border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <p className="text-xs md:text-sm text-amber-900 dark:text-amber-200">
            <span className="font-extrabold uppercase tracking-wider">Draft — not published.</span> Every entry marked
            [VERIFY: …] still needs fact-checking. This page is noindex and kept out of the site navigation and sitemap
            until you confirm it.
          </p>
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="pub-eye mb-3">Club Rudder vs {data.competitor}</div>
        <h1 className="pub-display text-3xl sm:text-4xl md:text-5xl mb-6">{data.h1}</h1>
        {data.intro.map((paragraph) => (
          <p key={paragraph.slice(0, 30)} className="text-base md:text-lg pub-muted max-w-2xl mx-auto mb-4 leading-relaxed">
            {paragraph}
          </p>
        ))}
        <div className="flex items-center justify-center gap-3 flex-wrap mt-9">
          <Link to="/create-club" className="pub-btn">
            Start free trial <ArrowRight className="w-4 h-4" />
          </Link>
          <button onClick={() => setDemoOpen(true)} className="pub-btn gh">
            <Calendar className="w-4 h-4" />
            Book a demo
          </button>
        </div>
        <p className="mt-6 text-sm font-semibold pub-muted">
          30-day free trial, no credit card required. Free migration, verified by a specialist before you go live.
        </p>
      </section>

      {/* Comparison table */}
      <section className="py-12 md:py-16 bg-slate-50 dark:bg-[#0d1311]">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="pub-display text-2xl md:text-4xl mb-3 text-slate-900 dark:text-[#F5F1E8]">
            Club Rudder and {data.competitor} at a glance
          </h2>
          <p className="pub-muted mb-8 max-w-3xl">
            The Club Rudder column is what we do today. The {data.competitor} column is deliberately left as
            placeholders — we would rather leave a gap than state something about another platform we have not verified.
          </p>
          <ComparisonTable rows={COMPARE_TABLE_ROWS} competitor={data.competitor} />
        </div>
      </section>

      {/* Deep dives */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 space-y-8">
          {COMPARE_SECTIONS.map((section) => (
            <CompareSection key={section.key} section={section} competitor={data.competitor} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="pub-display text-2xl md:text-3xl mb-6 text-center text-slate-900 dark:text-[#F5F1E8]">
            Questions club directors ask
          </h2>
          <div className="space-y-4">
            {COMPARE_FAQS.map((faq) => (
              <div key={faq.q} className="pub-card p-5">
                <h3 className="font-bold text-base mb-1.5 text-slate-900 dark:text-[#F5F1E8]">{faq.q}</h3>
                <p className="text-sm pub-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-3xl p-10 md:p-14 text-center" style={{ background: "#F5F1E8", color: "#101614" }}>
            <h2 className="pub-display text-3xl md:text-4xl mb-4">See it with your own club's data.</h2>
            <p className="mb-8 max-w-xl mx-auto pub-muted">
              Start a 30-day free trial, or book a walkthrough and we'll bring your club's structure into the demo.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/create-club" className="pub-btn">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={() => setDemoOpen(true)} className="pub-btn gh">
                Book a demo
              </button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}