import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import BookDemoDialog from "@/components/public/BookDemoDialog";
import JsonLd from "@/components/seo/JsonLd";
import JobPageHero from "@/components/landing/JobPageHero";
import JobPageModules from "@/components/landing/JobPageModules";
import JobPageFaq from "@/components/landing/JobPageFaq";
import PlatformModules from "@/components/landing/PlatformModules";
import usePageMeta from "@/lib/usePageMeta";
import { faqPageSchema } from "@/lib/seo/structuredData";
import { JOB_PAGES, JOB_PAGE_ORDER } from "@/lib/landing/jobPages";

/**
 * Shared layout for the single-job landing pages. The feature content is the
 * platform's own module data (see JobPageModules / PlatformModules) rather than
 * written copy, so each page mirrors exactly what the app does today.
 */
export default function JobPageLayout({ page }) {
  const [demoOpen, setDemoOpen] = useState(false);

  usePageMeta({ title: page.metaTitle, description: page.metaDescription });

  const others = JOB_PAGE_ORDER.filter((slug) => slug !== page.slug);
  const covered = page.modules.map((module) => module.key);

  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <JsonLd id="ld-job-faq" data={faqPageSchema(page.faqs)} />
      <PublicNav />

      <JobPageHero eyebrow={page.eyebrow} h1={page.h1} intro={page.intro} onBookDemo={() => setDemoOpen(true)} />

      <JobPageModules modules={page.modules} />

      <PlatformModules exclude={covered} />

      <JobPageFaq faqs={page.faqs} />

      {/* Cross-links to the other solutions pages */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="pub-display text-xl md:text-2xl mb-6 text-slate-900 dark:text-[#F5F1E8]">
            More of what Club Rudder does
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {others.map((slug) => (
              <Link key={slug} to={`/${slug}`} className="pub-btn sm gh">
                {JOB_PAGES[slug].navLabel}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-3xl p-10 md:p-14 text-center" style={{ background: "#F5F1E8", color: "#101614" }}>
            <h2 className="pub-display text-3xl md:text-4xl mb-4">Try it with your own club.</h2>
            <p className="mb-8 max-w-xl mx-auto pub-muted">
              Start a 30-day free trial — no credit card required — or book a demo and we'll bring your club's
              structure into the walkthrough.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/create-club" className="pub-btn">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={() => setDemoOpen(true)} className="pub-btn gh">
                <Calendar className="w-4 h-4" />
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