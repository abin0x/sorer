import React from "react";
import FeatureCard from "@/components/features/FeatureCard";
import { CORE_CARDS } from "@/components/features/featuresPageData";

export default function CoreSection() {
  return (
    <section id="core" className="max-w-6xl mx-auto px-5 sm:px-6 py-12 md:py-16 scroll-mt-24">
      <div className="max-w-3xl mb-8">
        <div className="pub-eye mb-2">Included in every plan</div>
        <h2 className="pub-display text-2xl md:text-4xl mb-3">The core platform.</h2>
        <p className="pub-muted">
          Every club gets these from day one. Payments go straight to your own Stripe account, with no per-transaction fee from Club Rudder.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {CORE_CARDS.map((c) => (
          <FeatureCard key={c.title} badge="Core" {...c} />
        ))}
      </div>
    </section>
  );
}