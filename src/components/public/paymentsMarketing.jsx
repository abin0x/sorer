import React from "react";
import { Link } from '@/lib/router-compat';
import { ArrowRight, Wallet, Landmark, BookOpen, Users } from "lucide-react";

// Processor names are shown as plain text wordmarks, not the companies' logo
// files: Stripe, Square and PayPal only allow their official, unaltered logo
// assets, and Echelon publishes no logo-use terms, so we don't reproduce marks.
export const PROCESSORS = [
  { key: "stripe", name: "Stripe", tag: "Quick self-serve setup", desc: "Create or connect a Stripe account from Club Settings in a few minutes. Cards, Apple Pay, Google Pay and bank debits, with payouts to your club's bank." },
  { key: "square", name: "Square", tag: "Quick self-serve setup", desc: "Connect an existing Square account or open one online. A good fit if your club already uses Square at the concession stand or club shop." },
  { key: "paypal", name: "PayPal", tag: "Familiar to many parents", desc: "Families can pay with the PayPal account they already have. Funds settle in your club's PayPal business account." },
  { key: "echelon", name: "Echelon", tag: "Negotiated rates, local rep", desc: "A merchant-services provider that works with a dedicated representative. Suits larger clubs that want to negotiate their processing rate." },
];

export function ProcessorWordmarks({ className = "" }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-3 ${className}`}>
      {PROCESSORS.map((p) => (
        <span key={p.key} className="pub-display text-xl md:text-2xl tracking-tight text-slate-700 dark:text-[#d9d4c7]">{p.name}</span>
      ))}
    </div>
  );
}

/** Homepage strip near the top. */
export function ProcessorStrip() {
  return (
    <section className="py-10 border-b border-slate-200 dark:border-[#2a3a33]">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <ProcessorWordmarks className="mb-4" />
        <p className="text-sm md:text-base pub-muted">
          Works with Stripe, Square, PayPal and Echelon. No transaction fees from Club Rudder, ever.{" "}
          <Link to="/payments" className="text-primary font-bold inline-flex items-center gap-1">How payments work <ArrowRight className="w-3.5 h-3.5" /></Link>
        </p>
        <p className="text-[11px] mt-3 text-slate-400 dark:text-[#a9a495]">Names are trademarks of their respective owners; no endorsement implied.</p>
      </div>
    </section>
  );
}

// Published list prices used in the $100 example. Keep sources with numbers.
export const STRIPE_LIST = { pct: 2.9, fixed: 0.3, source: "https://stripe.com/pricing", label: "Stripe standard US card rate" };
export const COMPETITOR_LIST = { name: "TeamSnap", pct: 3.25, fixed: 1.5, source: "https://info.teamsnap.com/youth-sports-payment-software.html", label: "TeamSnap for Business published processing rate" };

export const feeOn = (amount, { pct, fixed }) => Math.round(amount * pct + fixed * 100) / 100;

/** Pricing page box. */
export function WhatYouPayBox() {
  const amount = 100;
  const ours = feeOn(amount, STRIPE_LIST);
  const theirs = feeOn(amount, COMPETITOR_LIST);
  const fmt = (n) => `$${n.toFixed(2)}`;
  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="pub-card p-6 md:p-10">
          <div className="pub-eye mb-2">What you'll actually pay</div>
          <h2 className="pub-display text-2xl md:text-3xl mb-6">Two lines. That's the whole bill.</h2>
          <dl className="divide-y divide-slate-200 dark:divide-[#2a3a33] mb-8">
            <div className="flex justify-between gap-4 py-3"><dt className="font-bold">Club Rudder subscription</dt><dd className="pub-muted text-right">Your per-player plan, shown above</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="font-bold">Processing</dt><dd className="pub-muted text-right">Your processor's rate, no markup</dd></div>
          </dl>
          <h3 className="pub-display text-lg mb-3">The same {fmt(amount)} installment</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-[#2a3a33] p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider pub-muted mb-1">Typical competitor ({COMPETITOR_LIST.name}, list price)</p>
              <p className="text-3xl font-extrabold">{fmt(theirs)}</p>
              <p className="text-sm pub-muted">in fees at {COMPETITOR_LIST.pct}% + {fmt(COMPETITOR_LIST.fixed)}</p>
            </div>
            <div className="rounded-xl border-2 border-primary p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary mb-1">Club Rudder + Stripe (list price)</p>
              <p className="text-3xl font-extrabold text-primary">{fmt(ours)}</p>
              <p className="text-sm pub-muted">in fees at {STRIPE_LIST.pct}% + {fmt(STRIPE_LIST.fixed)}, all to Stripe. Club Rudder adds $0.00.</p>
            </div>
          </div>
          <p className="text-xs pub-muted mt-4 leading-relaxed">
            List prices for standard US card payments, checked November 2026. Sources:{" "}
            <a className="underline" href={COMPETITOR_LIST.source} target="_blank" rel="noreferrer">{COMPETITOR_LIST.label}</a>;{" "}
            <a className="underline" href={STRIPE_LIST.source} target="_blank" rel="noreferrer">{STRIPE_LIST.label}</a>.
            Negotiated, Square, PayPal and Echelon rates differ; your rate is whatever your processor charges you.
          </p>
        </div>
      </div>
    </section>
  );
}

const flow = [
  { icon: Users, label: "Family pays", desc: "Dues, installments, fees" },
  { icon: Wallet, label: "Your processor", desc: "Stripe, Square, PayPal or Echelon" },
  { icon: Landmark, label: "Your club's bank", desc: "Payouts straight to you" },
  { icon: BookOpen, label: "Your QuickBooks", desc: "Live sync, no CSV exports" },
];

/** Features + comparison pages: processor choice beside the live QuickBooks sync. */
export function MoneyFlowSection() {
  return (
    <section className="py-16 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="pub-eye mb-2">Family to club to books</div>
          <h2 className="pub-display text-2xl md:text-4xl">No one in between</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5 mb-10">
          <div className="pub-card p-6">
            <h3 className="pub-display text-lg mb-2">Your choice of processor</h3>
            <p className="text-sm pub-muted mb-4">Use Stripe, Square, PayPal or Echelon. Payments land in your club's own account, at your processor's rate, with no Club Rudder fee on top.</p>
            <ProcessorWordmarks className="!justify-start" />
          </div>
          <div className="pub-card p-6">
            <h3 className="pub-display text-lg mb-2">Live QuickBooks sync</h3>
            <p className="text-sm pub-muted">Each payment, refund and expense posts to your club's QuickBooks Online, mapped to teams and branches, so the books match the bank without exports.</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {flow.map((f, i) => (
            <React.Fragment key={f.label}>
              <div className="pub-card p-4 w-40 text-center">
                <f.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="pub-display text-sm">{f.label}</div>
                <div className="text-xs pub-muted mt-1">{f.desc}</div>
              </div>
              {i < flow.length - 1 && <ArrowRight className="w-5 h-5 text-primary shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
