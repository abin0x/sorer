import React, { useState, useRef, useEffect } from "react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import BookDemoDialog from "@/components/public/BookDemoDialog";
import WhyHero from "@/components/why/WhyHero";
import WhyProblem from "@/components/why/WhyProblem";
import WhyWorkflows from "@/components/why/WhyWorkflows";
import WhyObjections from "@/components/why/WhyObjections";
import WhyMigration from "@/components/why/WhyMigration";
import WhyFinalCTA from "@/components/why/WhyFinalCTA";
import WhyStickyCTA from "@/components/why/WhyStickyCTA";
import RoleTour from "@/components/showcase/RoleTour";
import usePageMeta from "@/lib/usePageMeta";
import JsonLd from "@/components/seo/JsonLd";
import { faqPageSchema } from "@/lib/seo/structuredData";
import { WHY_FAQ } from "@/lib/faqData";

const STATS = [
  { value: "0%", label: "Platform Cut of Payments" },
  { value: "30 Days", label: "Free Trial, No Card" },
  { value: "6", label: "Add-On Modules" },
  { value: "Free", label: "Verified Migration" },
  { value: "~3 Days", label: "Founding-Club Go-Live" },
];

// Structured data for the director FAQ rendered by <WhyObjections />.
const FAQ_SCHEMA = faqPageSchema(WHY_FAQ);

export default function WhyClubRudder() {
  const [demoOpen, setDemoOpen] = useState(false);
  const heroRef = useRef(null);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const openDemo = () => setDemoOpen(true);

  usePageMeta({
    title: "Why Club Rudder | The problem, the proof and your questions",
    description: "Why multi-branch soccer clubs move off spreadsheets and single-team tools: one roster, one payment system, one view for the board.",
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <JsonLd id="ld-faq-why" data={FAQ_SCHEMA} />
      <PublicNav />

      <div ref={heroRef}>
        <WhyHero onBookDemo={openDemo} />
      </div>

      {/* Stats bar — 5 cells, divided, thin borders */}
      <div className="max-w-5xl mx-auto px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2a3a33] bg-slate-200 dark:bg-[#2a3a33]">
          {STATS.map((s, i) => (
            <div key={i} className="bg-white dark:bg-[#17211d] p-5 text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-primary">{s.value}</div>
              <div className="text-[0.625rem] md:text-xs font-extrabold tracking-wider uppercase mt-1 text-slate-500 dark:text-[#a9a495]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <WhyProblem />
      <WhyWorkflows />

      {/* Section 5 — Role Tour (reused verbatim) */}
      <section className="py-16 md:py-20 bg-slate-50 dark:bg-[#0d1311]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="pub-eye mb-3">Every Seat</div>
            <h2 className="pub-display text-2xl md:text-4xl text-slate-900 dark:text-[#F5F1E8]">See the platform from every seat.</h2>
            <p className="max-w-2xl mx-auto mt-3 text-slate-600 dark:text-[#cfcabd]">
              Club Director, Club Admin, Coach, Bookkeeper, Facility Director, Parent, and Player — each gets a dashboard built for their actual decisions.
            </p>
          </div>
          <RoleTour />
        </div>
      </section>

      <WhyObjections />
      <WhyMigration />
      <WhyFinalCTA onBookDemo={openDemo} />

      <WhyStickyCTA visible={!heroVisible} onBookDemo={openDemo} />
      <PublicFooter />
      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}