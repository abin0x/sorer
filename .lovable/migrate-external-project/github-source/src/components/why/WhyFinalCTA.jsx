import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight } from "lucide-react";
import useFoundingSpots from "@/lib/useFoundingSpots";
import { FOUNDING_CLUB_TOTAL } from "@/lib/pricingCalculator";

export default function WhyFinalCTA({ onBookDemo }) {
  const spotsLeft = useFoundingSpots();

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="rounded-3xl p-10 md:p-16 text-center" style={{ background: "#F5F1E8", color: "#101614" }}>
          <div className="pub-eye mb-3" style={{ color: "hsl(var(--primary))" }}>Club Rudder</div>
          <h2 className="pub-display text-3xl md:text-5xl mb-4">
            One club. One system.
            <span className="block text-primary">Your brand.</span>
          </h2>
          <p className="text-base md:text-lg max-w-xl mx-auto mb-8 text-slate-700">
            See Club Rudder running on your club's structure — your branches, your age groups, your divisions. Twenty minutes, no slide deck.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={onBookDemo} className="pub-btn">
              <Calendar className="w-4 h-4" /> Book a demo
            </button>
            <Link to="/create-club" className="pub-btn gh">
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {spotsLeft > 0 && (
            <p className="mt-6 text-xs font-bold tracking-wider uppercase text-slate-500">
              {spotsLeft} founding spots left for the current onboarding cohort.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}