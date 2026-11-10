import React from "react";
import { motion } from "framer-motion";
import { ClipboardList, ArrowRightLeft, Settings2, Rocket } from "lucide-react";

/**
 * "How it works" — the journey from first contact to a live club. Factual
 * process steps only (no invented outcomes, counts, or testimonials).
 */
const STEPS = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Tell us about your club",
    desc: "Request a demo or start a free trial. Share how many branches, teams, and players you manage, and what you're running today.",
  },
  {
    icon: ArrowRightLeft,
    step: "02",
    title: "We migrate your data",
    desc: "A specialist moves your rosters, teams, and schedules from your current platform and verifies every record before you go live. No migration fee.",
  },
  {
    icon: Settings2,
    step: "03",
    title: "We set up your club",
    desc: "Branches, facilities, staff roles, and payment accounts are configured to match how your club actually operates.",
  },
  {
    icon: Rocket,
    step: "04",
    title: "You go live",
    desc: "Open registration, collect payments to your own Stripe account, and run your season — with support as you scale.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-20 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="pub-eye mb-2">How It Works</div>
          <h2 className="pub-display text-3xl md:text-5xl text-slate-900 dark:text-[#F5F1E8]">A smoother move to one connected club</h2>
          <p className="pub-muted mt-3 max-w-2xl mx-auto">
            A clear path from where you are today to running every branch on one platform — with a human verifying each step.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="pub-card p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="pub-display text-2xl" style={{ color: "hsl(var(--primary) / 0.25)" }}>{s.step}</span>
              </div>
              <h3 className="pub-display text-lg mb-2 text-slate-900 dark:text-[#F5F1E8]">{s.title}</h3>
              <p className="text-sm pub-muted">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}