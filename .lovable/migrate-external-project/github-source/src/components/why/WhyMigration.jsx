import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Search, FileSpreadsheet, Settings, Rocket } from "lucide-react";

const STEPS = [
  { icon: Search, label: "Learn about your club" },
  { icon: FileSpreadsheet, label: "Prepare your data" },
  { icon: Settings, label: "We set up your club" },
  { icon: Rocket, label: "You launch" },
];

export default function WhyMigration() {
  return (
    <section className="py-16 md:py-20 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left — copy */}
          <div>
            <div className="pub-eye mb-3">Migration</div>
            <h2 className="pub-display text-2xl md:text-4xl mb-4 text-slate-900 dark:text-[#F5F1E8]">
              Migration without
              <span className="block text-primary">the migraine.</span>
            </h2>
            <p className="text-slate-600 dark:text-[#cfcabd] leading-relaxed mb-6">
              Your data imports in a day, and most founding clubs are fully live in about 3 days. We bring in your players, families, teams, and history from spreadsheets, a CRM, or your current platform, so you launch with a club that already looks like yours.
            </p>

            {/* Step flow */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2a3a33] bg-white dark:bg-[#17211d]">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-slate-700 dark:text-[#cfcabd]">{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 dark:text-[#3a4d44]" />}
                  </div>
                );
              })}
            </div>

            <Link to="/MigrationWizard" className="pub-btn">
              See the full migration process <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right — visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white">
              <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <div className="ml-3 text-xs font-semibold text-slate-400 truncate">clubrudder.com/migration</div>
              </div>
              <div className="p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Migration Progress</div>
                <div className="space-y-2.5">
                  {[
                    { label: "Players imported", value: "247 / 247", done: true },
                    { label: "Families matched", value: "189 / 189", done: true },
                    { label: "Teams created", value: "18 / 18", done: true },
                    { label: "History synced", value: "In progress", done: false },
                    { label: "Branding applied", value: "Pending", done: false },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                      <span className="text-xs font-semibold text-slate-700">{row.label}</span>
                      <span className={`text-xs font-bold ${row.done ? "text-emerald-600" : "text-amber-500"}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: "68%" }} />
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-1.5">68% complete · Day 2 of 3</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}