import React from "react";
import { Link } from '@/lib/router-compat';
import { ArrowRight } from "lucide-react";
import { ANCHOR_CHIPS } from "@/components/features/featuresPageData";

export default function FeaturesHero() {
  return (
    <section className="max-w-4xl mx-auto px-5 sm:px-6 pt-14 md:pt-20 pb-10 text-center">
      <div className="pub-eye mb-3">Features</div>
      <h1 className="pub-display text-3xl sm:text-4xl md:text-6xl mb-5">
        Everything a multi-branch club runs on. One system.
      </h1>
      <p className="text-base md:text-lg pub-muted max-w-3xl mx-auto">
        Registration, tryouts, payments, scheduling and player development share one data model. Every branch, coach and family works from the same record, with no re-entry and no mismatched spreadsheets.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap mt-7">
        <Link to="/create-club" className="pub-btn">
          Start free trial <ArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/demo" className="pub-btn gh">Take the guided tour</Link>
      </div>
      <nav aria-label="Jump to a section" className="flex flex-wrap justify-center gap-2 mt-8">
        {ANCHOR_CHIPS.map((c) => (
          <a
            key={c.href}
            href={c.href}
            className="text-sm font-bold px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-[#2a3a33] pub-link"
          >
            {c.label}
          </a>
        ))}
      </nav>
    </section>
  );
}