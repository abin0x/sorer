import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, Landmark, RefreshCw, ArrowRight, Check, ShieldCheck } from "lucide-react";

const flow = [
  { icon: Wallet, label: "Family pays", desc: "At registration or checkout" },
  { icon: Landmark, label: "Your Stripe account", desc: "Funds land directly with you" },
  { icon: RefreshCw, label: "Your bank + QuickBooks", desc: "Two-way accounting sync" },
];

const points = [
  "No per-transaction fees from Club Rudder — ever.",
  "You own the payouts and the customer data, not us.",
  "Two-way QuickBooks sync is included in every plan, with no CSV exports.",
];

export default function PaymentsDifferentiatorSection() {
  return (
    <section id="payments" className="py-16 md:py-20 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="pub-eye mb-3">Payments, Done Right</div>
          <h2 className="pub-display text-3xl md:text-5xl mb-4 text-slate-900 dark:text-[#F5F1E8]">
            Your payments. Your Stripe account. No added Club Rudder transaction fee.
          </h2>
          <p className="pub-muted max-w-2xl">
            Most club platforms take a cut of every family payment. Club Rudder doesn't — payments go
            straight to your own processor account, and sync both ways with your accounting software.
            Stripe's standard processing fees still apply; we just don't add our own on top.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 md:gap-4 mb-10 flex-wrap">
          {flow.map((f, i) => {
            const Icon = f.icon;
            return (
              <React.Fragment key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="pub-card p-5 w-44 text-center"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="pub-display text-sm text-slate-900 dark:text-[#F5F1E8]">{f.label}</div>
                  <div className="text-xs pub-muted mt-1">{f.desc}</div>
                </motion.div>
                {i < flow.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-primary shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
          {points.map((pt, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex items-start gap-2.5 pub-card p-4"
            >
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <span className="text-sm font-semibold text-slate-700 dark:text-[#cfcabd]">{pt}</span>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#a9a495]">
            <ShieldCheck className="w-4 h-4 text-primary" /> Synced with QuickBooks
          </div>
          <Link to="/pricing" className="pub-btn">
            See Pricing <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}