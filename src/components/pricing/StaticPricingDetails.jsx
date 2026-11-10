import React from "react";
import { Link } from '@/lib/router-compat';
import { ArrowRight, Check } from "lucide-react";
import { useFoundingInfo } from "@/lib/useFoundingSpots";
import {
  DEFAULT_PRICING_CONFIG,
  INCLUDED_IN_EVERY_PLAN,
  VOLUME_SCHEDULE,
  normalizePricingConfig,
} from "@/lib/pricingCalculator";

/** Plain-text summary of the plans and modules, so the numbers are crawlable. */
const MODULE_SUMMARY = {
  payments: "Marketplace, events management, spiritwear store, staff and vendor invoicing, on top of the dues payments and QuickBooks sync in every plan.",
  kanban: "Kanban board, programs and tasks, RACI staff assignments, roadmaps and timelines.",
  player_dev: "Player roster, skill tests, physical assessments, E.P.I.C. evaluations and coach feedback.",
  facilities: "Facilities and fields, bookings, field-grid and calendar views, utilization analytics and booking alerts.",
  tournaments: "Tournament registration, brackets, scheduling, referee assignments and standings.",
  website: "Branded club website, automated social campaigns, marketing analytics and lead-capture pages.",
};

const SHORT_FAQ = [
  {
    q: "Is there a free trial?",
    a: "Yes — 30 days with no credit card required. You can build your club, try every module and migrate your data before you pay anything.",
  },
  {
    q: "Does Club Rudder take a cut of family payments?",
    a: "No. Club dues and family payments go straight into your own payment processor account (Stripe, Square, PayPal, Echelon or another gateway), and Club Rudder adds no per-transaction fee of its own. Your payment processor's standard fees still apply.",
  },
  {
    q: "Which tier will we be on?",
    a: "Tiers are matched to your club size: Standard for a single branch under 400 players, Pro for 1–3 branches up to 1,000 players, and Flagship for 4+ branches or over 1,000 players.",
  },
  {
    q: "What does migration cost?",
    a: "Nothing. Data migration is free and human-verified: your data imports in a day, and a specialist checks every record before you go live.",
  },
];

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const money0 = (n) => `$${Number(n || 0).toLocaleString()}`;

export default function StaticPricingDetails({ config = DEFAULT_PRICING_CONFIG }) {
  const c = normalizePricingConfig(config);
  const { tiers, modules } = c;
  const founding = useFoundingInfo();

  return (
    <section className="py-16 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="pub-eye mb-2">Plans &amp; Rates</div>
        <h2 className="pub-display text-3xl md:text-4xl text-slate-900 dark:text-[#F5F1E8]">
          Club Rudder pricing at a glance
        </h2>
        <p className="pub-muted mt-3 max-w-3xl">
          Every club pays a {money0(c.base_license_fee)} annual base license that includes the first {c.base_players_included} players.
          Players beyond that are billed at your tier's per-player rate, plus any of six optional add-on modules. The one-time
          onboarding fee is {money0(c.setup_fee_first_branch)} for the club plus {money0(c.setup_fee_additional_branch)} for each additional branch.
          No per-transaction fees from Club Rudder.
        </p>

        {/* Tiers */}
        <h3 className="pub-display text-xl md:text-2xl mt-10 mb-4 text-slate-900 dark:text-[#F5F1E8]">
          The three tiers
        </h3>
        <div className="pub-card overflow-x-auto">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Club Rudder tiers, who each is for and per-player rate</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2a3a33]">
                <th scope="col" className="p-4 font-extrabold text-slate-900 dark:text-[#F5F1E8]">Tier</th>
                <th scope="col" className="p-4 font-extrabold text-slate-900 dark:text-[#F5F1E8]">Who it's for</th>
                <th scope="col" className="p-4 font-extrabold text-slate-900 dark:text-[#F5F1E8]">Per extra player (per year)</th>
                <th scope="col" className="p-4 font-extrabold text-slate-900 dark:text-[#F5F1E8]">Module discount</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.key} className="border-b border-slate-100 dark:border-[#22302a] last:border-0">
                  <th scope="row" className="p-4 font-bold text-slate-900 dark:text-[#F5F1E8] align-top">{tier.name}</th>
                  <td className="p-4 pub-muted align-top">{tier.best_for}</td>
                  <td className="p-4 pub-muted align-top">{money(tier.per_player_cost)}</td>
                  <td className="p-4 pub-muted align-top">
                    {tier.module_discount_percent > 0 ? `${tier.module_discount_percent}% off add-ons` : "No extra module discount"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Included in every plan */}
        <h3 className="pub-display text-xl md:text-2xl mt-10 mb-4 text-slate-900 dark:text-[#F5F1E8]">
          What's included in every plan
        </h3>
        <div className="pub-card p-6">
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {INCLUDED_IN_EVERY_PLAN.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
              <span>Free, human-verified data migration — no migration fee, and data imports in a day</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
              <span>No per-transaction fees from Club Rudder — families pay straight into your own processor (Stripe, Square, PayPal, Echelon or another gateway)</span>
            </li>
          </ul>
          <p className="text-sm pub-muted mt-4">
            The marketplace, events management, the spiritwear store, and staff and vendor invoicing are
            unlocked by the Storefront &amp; Bookkeeping module. The other five add-on modules are optional.
          </p>
        </div>

        {/* Modules */}
        <h3 className="pub-display text-xl md:text-2xl mt-10 mb-4 text-slate-900 dark:text-[#F5F1E8]">
          The six add-on modules
        </h3>
        <div className="pub-card overflow-x-auto">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Club Rudder add-on modules and their annual list prices</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2a3a33]">
                <th scope="col" className="p-4 font-extrabold text-slate-900 dark:text-[#F5F1E8]">Module</th>
                <th scope="col" className="p-4 font-extrabold text-slate-900 dark:text-[#F5F1E8]">What it covers</th>
                <th scope="col" className="p-4 font-extrabold text-slate-900 dark:text-[#F5F1E8]">List price (per year)</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.key} className="border-b border-slate-100 dark:border-[#22302a] last:border-0">
                  <th scope="row" className="p-4 font-bold text-slate-900 dark:text-[#F5F1E8] align-top">{m.name}</th>
                  <td className="p-4 pub-muted align-top">{MODULE_SUMMARY[m.key] || m.notes}</td>
                  <td className="p-4 pub-muted align-top">{money0(m.list_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stacking discounts */}
        <h3 className="pub-display text-xl md:text-2xl mt-10 mb-4 text-slate-900 dark:text-[#F5F1E8]">
          How the add-on discounts stack
        </h3>
        <div className="pub-card p-6">
          <p className="pub-muted text-sm mb-4">
            Add modules in any order and the volume discount is applied to each one automatically, most
            expensive first. Your tier's module discount then applies to the module subtotal on top.
          </p>
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Volume discount applied per add-on module</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2a3a33]">
                <th scope="col" className="py-2 pr-4 font-extrabold text-slate-900 dark:text-[#F5F1E8]">Module added</th>
                <th scope="col" className="py-2 font-extrabold text-slate-900 dark:text-[#F5F1E8]">Volume discount</th>
              </tr>
            </thead>
            <tbody>
              {VOLUME_SCHEDULE.map((v) => (
                <tr key={v.label} className="border-b border-slate-100 dark:border-[#22302a] last:border-0">
                  <th scope="row" className="py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">{v.label}</th>
                  <td className="py-2 pub-muted">{v.off}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm pub-muted mt-4">
            Then the tier discount: Standard 0%, Pro 10% off modules, Flagship 20% off modules.
          </p>
        </div>

        {/* Founding offer + trial */}
        <h3 className="pub-display text-xl md:text-2xl mt-10 mb-4 text-slate-900 dark:text-[#F5F1E8]">
          Founding club offer and free trial
        </h3>
        <div className="pub-card p-6">
          <p className="pub-muted text-sm">
            The first {founding.total ?? c.founding_club_total} clubs to go live are founding clubs: their entire onboarding fee is waived,
            every branch included.
            Every club starts with a 30-day free trial — no credit card required.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Link to="/create-club" className="pub-btn">
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/migration" className="pub-btn gh">See how migration works</Link>
          </div>
        </div>

        {/* Short pricing FAQ */}
        <h3 className="pub-display text-xl md:text-2xl mt-10 mb-4 text-slate-900 dark:text-[#F5F1E8]">
          Pricing questions
        </h3>
        <div className="space-y-4">
          {SHORT_FAQ.map((item) => (
            <div key={item.q} className="pub-card p-5">
              <h4 className="font-bold text-slate-900 dark:text-[#F5F1E8] mb-1.5">{item.q}</h4>
              <p className="text-sm pub-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}