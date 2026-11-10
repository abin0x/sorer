import React from "react";
import { Link } from '@/lib/router-compat';
import FoundingClubsCard from "@/components/public/FoundingClubsCard";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import { ArrowRight, GitBranch, Users, Wallet, Zap } from "lucide-react";
import PushButtonSection from "@/components/landing/PushButtonSection";
import MigrationGuaranteeSection from "@/components/landing/MigrationGuaranteeSection";
import PaymentsDifferentiatorSection from "@/components/landing/PaymentsDifferentiatorSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import JobPagesGrid from "@/components/landing/JobPagesGrid";
import OwnershipSafeguardingSection from "@/components/landing/OwnershipSafeguardingSection";
import { ProcessorStrip } from "@/components/public/paymentsMarketing";
import usePageMeta from "@/lib/usePageMeta";
import JsonLd from "@/components/seo/JsonLd";
import { homepageSoftwareApplicationSchema } from "@/lib/seo/structuredData";

const stats = [
  { value: "0%", label: "Platform cut of family payments" },
  { value: "30 days", label: "Free trial, no card" },
  { value: "6", label: "Add-on modules" },
  { value: "Free", label: "Human-verified migration" },
];

const highlights = [
  { icon: GitBranch, title: "One club. Every branch. No silos.", desc: "Run every branch, across towns or regions, under a single club identity, with per-branch teams, facilities, and staff.", to: "/multi-branch-club-management-software" },
  { icon: Users, title: "Every role sees exactly what they need.", desc: "Directors, coaches, parents, and players each see what they need, scoped to their branch or team." },
  { icon: Wallet, title: "No per-transaction fees.", desc: "Payments go straight to the processor you choose (Stripe, Square, PayPal, Echelon or another gateway). We don't take a cut of every family payment.", to: "/club-payments-stripe-quickbooks" },
  { icon: Zap, title: "Your club, automated.", desc: "Registration approvals, payment reminders, and schedule alerts fire automatically across every branch." },
];

// Structured data for the homepage — only facts this page shows.
const APP_SCHEMA = homepageSoftwareApplicationSchema();

export default function Showcase() {


  usePageMeta({
    title: "Club Rudder | Soccer Club Management Software",
    description: "Registration, tryouts, payments and scheduling for multi-branch soccer clubs. Families pay straight into your own processor (Stripe, Square, PayPal, Echelon or another gateway) and we never take a cut. Built soccer-first, flexible for any club sport.",
  });

  return (
    <div className="bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <JsonLd id="ld-software-app" data={APP_SCHEMA} />
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[560px] md:min-h-[640px] flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-[#101614]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.16), transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.5] dark:opacity-[0.35]" style={{ backgroundImage: "radial-gradient(hsl(var(--primary) / 0.18) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-24">
          <h1 className="pub-display text-4xl sm:text-6xl md:text-6xl mb-6 pub-rise" style={{ animationDelay: "0.2s" }}>
            One platform for
            <span className="block text-primary" style={{ textShadow: "0 0 50px hsl(var(--primary) / 0.4)" }}>every branch of your club.</span>
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-4 pub-muted pub-rise" style={{ animationDelay: "0.35s" }}>
            Club Rudder is soccer club management software for multi-branch clubs: youth soccer registration, tryouts and payments in one place.
          </p>
          <p className="text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-4 pub-muted pub-rise" style={{ animationDelay: "0.4s" }}>
            Families pay straight into your own processor — Stripe, Square, PayPal, Echelon or another gateway — and we never take a cut.
          </p>
          <p className="text-sm md:text-base max-w-2xl mx-auto mb-8 pub-muted pub-rise" style={{ animationDelay: "0.55s" }}>
            Switching? We migrate your data for free. Imports run in a day, and most founding clubs are fully live in about 3 days.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap pub-rise" style={{ animationDelay: "0.8s" }}>
            <Link to="/create-club" className="pub-btn">Start free trial <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/walkthrough" className="pub-btn gh">Take an interactive tour <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <p className="mt-10 text-xs font-extrabold tracking-widest uppercase text-slate-400 dark:text-[#a9a495] pub-rise" style={{ animationDelay: "1s" }}>
            Built soccer-first. Flexible for any club sport.
          </p>
        </div>
      </section>

      <ProcessorStrip />

      {/* Stats bar */}
      <div className="max-w-5xl mx-auto px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2a3a33] bg-slate-200 dark:bg-[#2a3a33]">
          {stats.map((s, i) => (
            <div key={i} className="pub-rise bg-white dark:bg-[#17211d] p-6 text-center" style={{ animationDelay: `${0.1 * i}s` }}>
              <div className="text-3xl font-extrabold text-primary">{s.value}</div>
              <div className="text-xs font-extrabold tracking-wider uppercase mt-1 pub-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights */}
      <section id="modules" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <div className="pub-eye mb-3">Club Rudder</div>
            <h2 className="pub-display text-2xl md:text-4xl text-slate-900 dark:text-[#F5F1E8]">One club. Every branch. One shared system.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {highlights.map((h, i) => {
              const Card = h.to ? Link : "div";
              const cardProps = h.to ? { to: h.to } : {};
              return (
                <Card
                  key={i}
                  {...cardProps}
                  className="pub-rise pub-card p-6 flex flex-col"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                    <h.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="pub-display text-lg mb-2 text-slate-900 dark:text-[#F5F1E8]">{h.title}</h3>
                  <p className="text-sm pub-muted">{h.desc}</p>
                  {h.to && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary mt-4">
                      Read more <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <HowItWorksSection />

      <section className="pb-4 pt-12">
        <div className="max-w-5xl mx-auto px-6">
          <FoundingClubsCard ctaTo="/create-club" ctaLabel="Start free trial" />
        </div>
      </section>

      <PushButtonSection />
      <MigrationGuaranteeSection />
      <PaymentsDifferentiatorSection />
      <OwnershipSafeguardingSection />

      {/* Explore features CTA */}
      <section className="py-12 md:py-16 bg-slate-50 dark:bg-[#0d1311]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="pub-eye mb-2">Explore the platform</div>
          <h2 className="pub-display text-2xl md:text-4xl text-slate-900 dark:text-[#F5F1E8] mb-3">See what Club Rudder does for each job</h2>
          <p className="pub-muted max-w-xl mx-auto mb-6">
            Registration, money, facilities, development and marketing, with the roles each one serves and whether it is included or an add-on.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/features" className="pub-btn">Explore features <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/demo" className="pub-btn gh">Take the tour</Link>
          </div>
          <div className="mt-10">
            <JobPagesGrid />
          </div>
        </div>
      </section>

      {/* Bright CTA */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-3xl p-10 md:p-16 text-center" style={{ background: "#e5e4efff", color: "#101614" }}>
            <div className="pub-eye mb-3" style={{ color: "hsl(var(--primary))" }}>Club Rudder</div>
            <h2 className="pub-display text-3xl md:text-5xl mb-6">Bring every branch together.</h2>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/create-club" className="pub-btn">Start free trial <ArrowRight className="w-4 h-4" /></Link>
              <Link to="/walkthrough" className="pub-btn gh">Take an interactive tour <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />

    </div>
  );
}