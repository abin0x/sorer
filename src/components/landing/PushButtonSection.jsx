import React from "react";
import { Link } from '@/lib/router-compat';
import { motion } from "framer-motion";
import { ArrowLeftRight, CalendarClock, ClipboardCheck, ArrowRight } from "lucide-react";

const columns = [
  {
    icon: ArrowLeftRight,
    headline: "Switch from TeamSnap, SportsEngine, or any platform.",
    body: "Upload your export file, click migrate, and watch your members, teams, schedules, and payment history flow into Club Rudder. Our automated importer maps your data automatically — and our support team reviews every migration personally before you go live.",
    proof: "No migration fee. Every record verified.",
    ctaLabel: "Start Your Free Migration",
    ctaTo: "/create-club",
  },
  {
    icon: CalendarClock,
    headline: "Roll over last season in one click.",
    body: "Your teams, rosters, schedules, payment plans, and family profiles carry forward automatically. Adjust fees, update age brackets, and publish — all from a single dashboard. No re-entering data. No rebuilding from scratch.",
    proof: "Teams, rosters, and plans carry forward.",
    ctaLabel: "See Season Automation",
    ctaTo: "/features#registration",
  },
  {
    icon: ClipboardCheck,
    headline: "From registration to roster in one click.",
    body: "Open tryout registration, collect fees and waivers automatically, run evaluations, and move players to teams — all connected. Age eligibility rules, waitlists, capacity limits, and financial-aid reviews happen automatically. You just make the calls.",
    proof: "Fees, waivers, and evaluations connected.",
    ctaLabel: "Explore Tryout Management",
    ctaTo: "/features#registration",
  },
];

export default function PushButtonSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-12">
          <div className="text-center lg:text-left">
            <div className="pub-eye mb-3">Intuitive Automation</div>
            <h2 className="pub-display text-3xl md:text-5xl text-slate-900 dark:text-[#F5F1E8]">
              Season setup, migration, and tryouts — without the busywork.
            </h2>
          </div>
          <div className="relative w-full aspect-[4/3] rounded-2xl border border-slate-200 dark:border-[#2a3a33] overflow-hidden flex items-center justify-center" style={{ background: "radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(ellipse at 80% 90%, hsl(var(--primary) / 0.12), transparent 55%)" }}>
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(hsl(var(--primary) / 0.2) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div className="relative grid grid-cols-3 gap-4 p-8">
              {[ArrowLeftRight, CalendarClock, ClipboardCheck].map((Ic, i) => (
                <div key={i} className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.14)", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                  <Ic className="w-7 h-7 text-primary" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {columns.map((col, i) => {
            const Icon = col.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="pub-card p-7 flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="pub-display text-xl mb-2.5 text-slate-900 dark:text-[#F5F1E8]">{col.headline}</h3>
                <p className="text-sm leading-relaxed flex-1 pub-muted">{col.body}</p>
                <p className="text-xs font-extrabold mt-4 text-primary">{col.proof}</p>
                <Link to={col.ctaTo} className="pub-link inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-slate-900 dark:text-[#F5F1E8]">
                  {col.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}