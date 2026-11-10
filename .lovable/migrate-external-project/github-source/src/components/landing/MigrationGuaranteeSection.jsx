import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MousePointerClick, Cog, UserCheck, Rocket, ArrowRight } from "lucide-react";

const steps = [
  { icon: MousePointerClick, title: "Click migrate.", desc: "Upload your export from any platform." },
  { icon: Cog, title: "We do the heavy lifting.", desc: "Our automated system maps, cleans, and imports your data." },
  { icon: UserCheck, title: "A human reviews it.", desc: "A Club Rudder support specialist checks every migration before you go live." },
  { icon: Rocket, title: "You confirm.", desc: "Review the migration report and approve. If anything is off, we fix it — free." },
];

export default function MigrationGuaranteeSection() {
  return (
    <section id="migration" className="py-16 md:py-20 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="pub-eye mb-3">The Migration Guarantee</div>
          <h2 className="pub-display text-3xl md:text-5xl mb-4 text-slate-900 dark:text-[#F5F1E8]">
            Migration without the migraine.
          </h2>
          <p className="pub-muted max-w-2xl">
            Switching platforms shouldn't feel like a gamble. Every Club Rudder migration starts with a
            single click — and ends with a member of our support team personally verifying that your
            data landed exactly where it should.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="pub-card p-6 text-center"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider mb-1.5 text-primary">Step {i + 1}</div>
                <h3 className="pub-display text-lg mb-1.5 text-slate-900 dark:text-[#F5F1E8]">{s.title}</h3>
                <p className="text-sm pub-muted">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-semibold max-w-2xl text-center text-slate-900 dark:text-[#F5F1E8]">
            Data imports in a day, and most founding clubs are fully live in about 3 days. A specialist verifies every migration, and we fix anything we miss at no cost.
          </p>
          <Link to="/migration" className="pub-btn">
            Start Your Free Migration <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}