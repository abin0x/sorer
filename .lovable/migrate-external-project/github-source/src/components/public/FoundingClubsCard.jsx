import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import useFoundingSpots from "@/lib/useFoundingSpots";
import { FOUNDING_CLUB_TOTAL, FOUNDING_OFFER_ENDS } from "@/lib/pricingCalculator";

/**
 * Prominent founding-clubs offer card for all public-facing pages.
 * Numbers stay consistent with the pricing page: the setup fee is waived
 * entirely for the first 10 founding clubs, the rate is locked, and a 30-day
 * free trial applies. The spots-left count is fetched live.
 */
export default function FoundingClubsCard({ ctaTo = "/create-club", ctaLabel = "Start free trial" }) {
  const spotsLeft = useFoundingSpots();

  const open = spotsLeft > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.82))", borderColor: "hsl(var(--primary))" }}
    >
      <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full pub-glow" style={{ background: "hsl(var(--primary-foreground))", opacity: 0.18 }} />

      <div className="relative p-8 md:p-11 text-white">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm mb-5">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-xs font-bold tracking-wider uppercase">Founding Club Offer</span>
        </div>

        <h3 className="pub-display text-3xl md:text-4xl mb-5">
          {open ? `Only ${spotsLeft} founding spots left` : "Founding clubs are full"}
        </h3>

        <div className="flex flex-wrap gap-3 mb-7">
          <div className="bg-black/25 backdrop-blur-sm rounded-xl px-5 py-3.5">
            <span className="block text-xl font-extrabold">Setup fee</span>
            <span className="text-xs text-white/80 font-semibold">{open ? "Waived entirely" : "Standard rates"}</span>
          </div>
          <div className="bg-black/25 backdrop-blur-sm rounded-xl px-5 py-3.5">
            <span className="block text-xl font-extrabold">Rate lock</span>
            <span className="text-xs text-white/80 font-semibold">{open ? `Until ${FOUNDING_OFFER_ENDS}` : "Standard rates"}</span>
          </div>
          <div className="bg-black/25 backdrop-blur-sm rounded-xl px-5 py-3.5">
            <span className="block text-xl font-extrabold">30 days</span>
            <span className="text-xs text-white/80 font-semibold">Free trial</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link to={ctaTo} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors min-h-[44px]">
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-white/90">
            <Check className="w-4 h-4" /> No credit card required
          </div>
        </div>
      </div>
    </motion.div>
  );
}