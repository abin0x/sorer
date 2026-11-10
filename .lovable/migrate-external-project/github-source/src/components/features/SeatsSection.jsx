import React from "react";
import { SEATS } from "@/components/features/featuresPageData";

export default function SeatsSection() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 py-12 md:py-16">
      <div className="max-w-3xl mb-8">
        <div className="pub-eye mb-2">Every seat</div>
        <h2 className="pub-display text-2xl md:text-4xl">Each role sees what it needs to decide.</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SEATS.map((s) => (
          <div key={s.title} className="pub-card p-5">
            <h3 className="font-extrabold mb-1">{s.title}</h3>
            <p className="text-sm pub-muted">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}