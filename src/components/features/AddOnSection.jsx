import React from "react";
import { Link } from '@/lib/router-compat';
import FeatureCard from "@/components/features/FeatureCard";
import { MODULE_CARDS } from "@/components/features/featuresPageData";

export default function AddOnSection() {
  return (
    <section className="py-12 md:py-16 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="max-w-3xl mb-8">
          <div className="pub-eye mb-2">Add-on modules</div>
          <h2 className="pub-display text-2xl md:text-4xl mb-3">Add only what your club needs.</h2>
          <p className="pub-muted">
            Each module plugs into the same data model. Stack more than one and each additional module is discounted automatically.
          </p>
        </div>
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
          {MODULE_CARDS.map(({ price, ...m }) => (
            <FeatureCard key={m.id} badge={`Add-on · ${price}`} {...m} />
          ))}
        </div>
        <p className="text-sm pub-muted mt-6">
          Add-on prices are billed annually.{" "}
          <Link to="/walkthrough" className="text-primary font-semibold underline">Take a tour</Link>{" "}
          to see what each module does.
        </p>
      </div>
    </section>
  );
}