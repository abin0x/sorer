import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";

/** Hero for a single-job landing page: eyebrow, H1, intro copy and both CTAs. */
export default function JobPageHero({ eyebrow, h1, intro, onBookDemo }) {
  return (
    <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
      <div className="pub-eye mb-3">{eyebrow}</div>
      <h1 className="pub-display text-3xl sm:text-4xl md:text-5xl mb-6">{h1}</h1>
      {intro.map((paragraph) => (
        <p key={paragraph.slice(0, 30)} className="text-base md:text-lg pub-muted max-w-2xl mx-auto mb-4 leading-relaxed">
          {paragraph}
        </p>
      ))}
      <div className="flex items-center justify-center gap-3 flex-wrap mt-9">
        <Link to="/create-club" className="pub-btn">
          Start free trial <ArrowRight className="w-4 h-4" />
        </Link>
        <button onClick={onBookDemo} className="pub-btn gh">
          <Calendar className="w-4 h-4" />
          Book a demo
        </button>
      </div>
      <p className="mt-6 text-sm font-semibold pub-muted">
        30-day free trial, no credit card required. Free, human-verified migration when you switch.
      </p>
    </section>
  );
}