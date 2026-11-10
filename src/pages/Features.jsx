import React from "react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import FeaturesHero from "@/components/features/FeaturesHero";
import CoreSection from "@/components/features/CoreSection";
import AddOnSection from "@/components/features/AddOnSection";
import SeatsSection from "@/components/features/SeatsSection";
import MobileAndSwitching from "@/components/features/MobileAndSwitching";
import FeaturesFinalCTA from "@/components/features/FeaturesFinalCTA";
import JobPagesGrid from "@/components/landing/JobPagesGrid";
import { MoneyFlowSection } from "@/components/public/paymentsMarketing";
import usePageMeta from "@/lib/usePageMeta";

export default function Features() {
  usePageMeta({
    title: "Soccer Club Management Software Features | Club Rudder",
    description: "Registration, tryouts, payments, scheduling and player development in one system for multi-branch clubs. No per-transaction fees.",
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <PublicNav />
      <main>
        <FeaturesHero />
        <CoreSection />

        {/* One page per core job, for visitors who want the detail */}
        <section className="py-12 md:py-16 bg-slate-50 dark:bg-[#0d1311]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-8">
              <div className="pub-eye mb-3">Go deeper</div>
              <h2 className="pub-display text-2xl md:text-3xl text-slate-900 dark:text-[#F5F1E8]">One job, one page</h2>
            </div>
            <JobPagesGrid />
          </div>
        </section>

        <MoneyFlowSection />
        <AddOnSection />
        <SeatsSection />
        <MobileAndSwitching />
        <FeaturesFinalCTA />
      </main>
      <PublicFooter />
    </div>
  );
}