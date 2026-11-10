import React from "react";
import { Link } from "react-router-dom";
import { Download, ShieldCheck, Check, ArrowRight } from "lucide-react";

const OWNERSHIP = [
  "Your players, families, teams and payment records belong to your club.",
  "Export them as CSV whenever you like, no request and no fee.",
  "Payments settle in your own Stripe account, so billing history stays with you.",
];

const SAFEGUARDING = [
  "Role-based access: staff, parents and players only see their own branch, team or family.",
  "Coach background-check and SafeSport certificates tracked with expiry reminders.",
  "Documents are stored privately, and any user can delete their own account.",
];

function Card({ icon: Icon, eyebrow, title, items }) {
  return (
    <div className="pub-card p-7 flex flex-col">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary) / 0.12)" }}>
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="pub-eye mb-2">{eyebrow}</div>
      <h3 className="pub-display text-xl mb-4 text-slate-900 dark:text-[#F5F1E8]">{title}</h3>
      <ul className="space-y-2.5">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2.5 text-sm pub-muted">
            <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OwnershipSafeguardingSection() {
  return (
    <section id="trust" className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="pub-eye mb-3">Trust</div>
          <h2 className="pub-display text-3xl md:text-5xl text-slate-900 dark:text-[#F5F1E8]">Your data. Your families' privacy.</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          <Card icon={Download} eyebrow="What if we leave?" title="You own your data, always." items={OWNERSHIP} />
          <Card icon={ShieldCheck} eyebrow="Privacy & safeguarding" title="Built for youth sports." items={SAFEGUARDING} />
        </div>
        <div className="text-center mt-8">
          <Link to="/why-clubrudder#faq" className="pub-link inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-[#F5F1E8]">
            Read the full answers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}