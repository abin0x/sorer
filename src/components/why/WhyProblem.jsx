import React from "react";
import { motion } from "framer-motion";
import { ClipboardList, GitBranch, BarChart3 } from "lucide-react";

const CARDS = [
  {
    icon: ClipboardList,
    title: "Families repeat themselves in every tool.",
    body: "Signups in one tool, payments in another, rosters in a spreadsheet. Parents re-enter the same details for every team and season, and staff re-key them again.",
  },
  {
    icon: GitBranch,
    title: "Six branches, six versions of the truth.",
    body: "Every location runs its own spreadsheet, its own WhatsApp group, its own Google Form. Roll up to the club level and the numbers don't match.",
  },
  {
    icon: BarChart3,
    title: "The board asks. You guess.",
    body: "Retention, growth, cost per player, tryout conversion — the numbers your board wants don't exist in one place. So you build them by hand, late, and hope they're right.",
  },
];

export default function WhyProblem() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="pub-display text-2xl md:text-4xl text-slate-900 dark:text-[#F5F1E8]">
            The club isn't the problem.
            <span className="block text-primary">The tooling is.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {CARDS.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="pub-card p-6 flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="pub-display text-lg mb-2 text-slate-900 dark:text-[#F5F1E8]">{c.title}</h3>
                <p className="text-sm text-slate-600 dark:text-[#cfcabd] leading-relaxed">{c.body}</p>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-sm md:text-base font-semibold max-w-2xl mx-auto text-slate-500 dark:text-[#a9a495]">
          Club Rudder replaces your registration and player dashboards with one streamlined interface — signups, rosters, profiles, and payments in a single connected system.
        </p>
      </div>
    </section>
  );
}