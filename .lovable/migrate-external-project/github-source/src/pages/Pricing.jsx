import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Check, Gift, ShieldCheck, Star, Wallet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import BookDemoDialog from "@/components/public/BookDemoDialog";
import TierSelector from "@/components/pricing/TierSelector";
import ModuleCardGrid from "@/components/pricing/ModuleCardGrid";
import PriceSummary from "@/components/pricing/PriceSummary";
import TierComparison from "@/components/pricing/TierComparison";
import PricingFAQ from "@/components/pricing/PricingFAQ";
import FoundingClubsCard from "@/components/public/FoundingClubsCard";
import FullPlatformExample from "@/components/pricing/FullPlatformExample";
import useFoundingSpots from "@/lib/useFoundingSpots";
import usePageMeta from "@/lib/usePageMeta";
import JsonLd from "@/components/seo/JsonLd";
import { pricingSoftwareApplicationSchema } from "@/lib/seo/structuredData";
import StaticPricingDetails from "@/components/pricing/StaticPricingDetails";
import CompetitorComparison from "@/components/public/CompetitorComparison";
import { DEFAULT_PRICING_CONFIG, suggestTierKey, calculatePricing, INCLUDED_IN_EVERY_PLAN, FOUNDING_CLUB_TOTAL, FOUNDING_OFFER_ENDS, VOLUME_SCHEDULE } from "@/lib/pricingCalculator";

export default function Pricing() {
  const [config, setConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [branches, setBranches] = useState(1);
  const [players, setPlayers] = useState(100);
  const [tierKey, setTierKey] = useState("fairway");
  const [moduleKeys, setModuleKeys] = useState([]);
  const [demoOpen, setDemoOpen] = useState(false);
  const foundingSpotsLeft = useFoundingSpots();

  usePageMeta({
    title: "Pricing | Per-Player Club Software | Club Rudder",
    description: "Transparent per-player pricing for multi-branch soccer clubs. No transaction fees, a 30-day free trial, and add-on modules that get cheaper as you stack them.",
  });

  // Structured data mirrors the tier rates the calculator is showing.
  const appSchema = useMemo(() => pricingSoftwareApplicationSchema(config), [config]);

  useEffect(() => {
    base44.entities.PricingConfig.list().then((rows) => {
      if (rows?.[0]?.tiers?.length) setConfig(rows[0]);
    }).catch(() => {});
  }, []);

  // Tiers are assigned by club size, so the tier always follows branches + players.
  useEffect(() => {
    setTierKey(suggestTierKey(branches, players));
  }, [branches, players]);

  const waiveSetup = foundingSpotsLeft > 0;
  const result = useMemo(
    () => calculatePricing(config, { branches, players, tierKey, moduleKeys, waiveSetup }),
    [config, branches, players, tierKey, moduleKeys, waiveSetup]
  );

  const toggleModule = (key) =>
  setModuleKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <JsonLd id="ld-software-app" data={appSchema} />
      <PublicNav />

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-primary text-primary mb-6">
            <Wallet className="w-3.5 h-3.5" />
            <span className="text-xs font-extrabold tracking-wider uppercase">No per-transaction fees. Ever.</span>
          </div>
          <h1 className="pub-display text-4xl md:text-6xl mb-4">Transparent billing.<br />You pick your price.</h1>
          <p className="text-lg pub-muted max-w-2xl mx-auto">Payments go straight to your own Stripe account — we take no cut. Build your plan below and see your Year 1 cost and ongoing rate update live.</p>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="pub-card p-6">
              <h2 className="pub-display text-xl mb-1">1. Your tier, matched to your club size</h2>
              <p className="text-sm pub-muted mb-4">Tiers are set by branches and players, and larger clubs pay less per player. Enter your size in step 2 and your tier updates. Every tier includes the core platform: registration, tryouts, messaging, calendars, club dues payments and QuickBooks sync. The marketplace, events management, and spiritwear store unlock with the Storefront &amp; Bookkeeping module.</p>
              <TierSelector tiers={config.tiers} tierKey={tierKey} />
            </div>

            <div className="pub-card p-6">
              <h2 className="pub-display text-xl mb-4">2. Your club size</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="branches">Branches</Label>
                  <Input id="branches" type="number" min={1} value={branches} onChange={(e) => setBranches(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="players">Players</Label>
                  <Input id="players" type="number" min={0} value={players} onChange={(e) => setPlayers(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="pub-card p-6">
              <h2 className="pub-display text-xl mb-1">3. Add-on modules</h2>
              <p className="text-sm pub-muted mb-4">Stack modules and save — each additional one is discounted automatically.</p>
              <ModuleCardGrid modules={config.modules} selectedKeys={moduleKeys} onToggle={toggleModule} />
            </div>
          </div>

          <div className="space-y-4">
            <PriceSummary result={result} foundingSpotsLeft={foundingSpotsLeft} />

            <div className="flex flex-col gap-2">
              <Button asChild className="w-full gap-2 text-[hsl(var(--primary-foreground))]">
                <Link to="/create-club">Start free trial <ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button variant="outline" onClick={() => setDemoOpen(true)} className="w-full gap-2">
                Book a demo
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              No per-transaction fees from Club Rudder — payment processing charges go straight to Stripe or your chosen payment method, with no markup from us.
            </p>

            {/* Included in every plan */}
            <div className="pub-card p-5">
              <p className="pub-eye mb-3">Included in every plan</p>
              <ul className="space-y-2">
                {INCLUDED_IN_EVERY_PLAN.map((item) =>
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Founding offer */}
            {foundingSpotsLeft > 0 &&
            <div className="rounded-2xl p-5 text-white" style={{ background: "hsl(var(--primary))" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-wider uppercase">Founding Club Offer</span>
                </div>
                <p className="font-extrabold text-lg leading-tight mb-1">Only {foundingSpotsLeft} founding spots left</p>
                <p className="text-sm text-white/85 mb-3">Join now and we'll waive your entire setup fee — every branch included. Your per-player and module rates are locked through {FOUNDING_OFFER_ENDS}.</p>
                <Link to="/create-club" className="inline-flex items-center gap-1.5 text-sm font-bold underline">Claim a spot <ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
            }

            {/* Migration guarantee */}
            <div className="pub-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="pub-eye">Free Migration Guarantee</span>
              </div>
              <p className="text-sm pub-muted">A specialist verifies every migration before you go live, and we fix anything we miss at no cost.</p>
              </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              Club Rudder is built for the long term. Our pricing is a per-player subscription, not a bet on payment volume, and founding clubs keep their rates through {FOUNDING_OFFER_ENDS}.
            </p>
              </div>
              </div>
              </section>

      {/* Static, crawlable plan details for search engines and AI answer engines */}
      <StaticPricingDetails config={config} />

      {/* How the savings work */}
      <section className="bg-slate-50 dark:bg-[#0d1311] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="pub-eye mb-2">Stack &amp; Save</div>
          <h2 className="pub-display text-3xl md:text-4xl mb-3">How the add-on savings work</h2>
          <p className="pub-muted mb-8 max-w-2xl mx-auto">Add modules in any order — we apply the discount to each one automatically, most expensive first. Then your tier's discount stacks on top.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {VOLUME_SCHEDULE.map((v, i) =>
            <div key={i} className="pub-card p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-[#a9a495]">{v.label}</p>
                <p className="text-xl font-extrabold mt-1 text-primary">{v.off}</p>
              </div>
            )}
          </div>
          <FullPlatformExample config={config} />
        </div>
      </section>

      {/* Compare plans */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="pub-eye mb-2">Compare Plans</div>
            <h2 className="pub-display text-3xl md:text-4xl">How tiers work</h2>
            <p className="pub-muted mt-3 max-w-2xl mx-auto">Every tier includes the core platform — registration, tryouts, messaging, calendars, and club dues payments. Higher tiers add deeper support, bigger module discounts, and concierge services.</p>
          </div>
          <div className="pub-card overflow-hidden">
            <TierComparison tiers={config.tiers} />
          </div>
        </div>
      </section>

      {/* Competitor comparison */}
      <section className="py-16 bg-slate-50 dark:bg-[#0d1311]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="pub-eye mb-2">How We Compare</div>
            <h2 className="pub-display text-3xl md:text-4xl">Club Rudder vs. the alternatives</h2>
            <p className="pub-muted mt-3 max-w-2xl mx-auto">See how Club Rudder stacks up against TeamSnap, SportsEngine HQ, and Sprocket Sports across the features that matter to multi-branch clubs.</p>
          </div>
          <CompetitorComparison />
        </div>
      </section>

      {/* Founding member offer */}
      <section className="pb-16">
        <div className="max-w-5xl mx-auto px-6">
          <FoundingClubsCard ctaTo="/create-club" ctaLabel="Claim a founding spot" />
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 dark:bg-[#0d1311] py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="pub-eye mb-2">FAQ</div>
            <h2 className="pub-display text-3xl md:text-4xl">Questions, answered</h2>
          </div>
          <PricingFAQ />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-3xl p-10 md:p-14 text-center" style={{ background: "#F5F1E8", color: "#101614" }}>
            <h2 className="pub-display text-3xl md:text-4xl mb-4">Ready to see it in action?</h2>
            <p className="mb-8 max-w-xl mx-auto pub-muted">Start a 30-day free trial — no credit card required — or book a demo and we'll walk you through it.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/create-club" className="pub-btn">Start free trial <ArrowRight className="w-4 h-4" /></Link>
              <button onClick={() => setDemoOpen(true)} className="pub-btn gh">Book a demo</button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>);

}