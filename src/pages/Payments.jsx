import React from "react";
import { Link } from '@/lib/router-compat';
import { ArrowRight } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import usePageMeta from "@/lib/usePageMeta";
import { PROCESSORS, MoneyFlowSection } from "@/components/public/paymentsMarketing";

const QUESTIONS = [
  { q: "Can I keep my current processor?", a: "Yes, if it's Stripe, Square, PayPal or Echelon. Connect your existing account in Club Settings and payments keep flowing to it." },
  { q: "Can I switch later?", a: "Yes. Connect the new processor and set it as your club's preferred option. New checkouts use it; past payments stay recorded where they were made." },
  { q: "Who handles chargebacks and payouts?", a: "Your processor. Payouts go from your processor to your club's bank on its schedule, and disputes are handled in your processor account. Club Rudder never holds your money." },
  { q: "Do payment plans work on every processor?", a: "Installment plans are set up in Club Rudder for all four. Automatic charging of saved cards depends on what your processor supports; where it isn't available, families get a reminder with a link to pay each installment." },
];

export default function Payments() {
  usePageMeta({
    title: "Club Payments: Stripe, Square, PayPal & Echelon | Club Rudder",
    description: "Collect club dues through Stripe, Square, PayPal or Echelon. Your processor's rate, no Club Rudder markup, with live QuickBooks sync.",
  });
  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <PublicNav />
      <main>
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="pub-eye mb-3">Payments</div>
          <h1 className="pub-display text-4xl md:text-5xl mb-4">Pick the processor that fits your club</h1>
          <p className="pub-muted max-w-2xl mx-auto">Club Rudder works with four processors. Money goes into your club's own account, and Club Rudder adds no transaction fee.</p>
        </section>
        <section className="pb-16">
          <div className="max-w-5xl mx-auto px-6 grid sm:grid-cols-2 gap-5">
            {PROCESSORS.map((p) => (
              <article key={p.key} className="pub-card p-6">
                <h2 className="pub-display text-2xl mb-1">{p.name}</h2>
                <p className="text-xs font-extrabold uppercase tracking-wider text-primary mb-3">{p.tag}</p>
                <p className="text-sm pub-muted">{p.desc}</p>
              </article>
            ))}
          </div>
          <p className="text-center text-xs pub-muted mt-6 px-6">Listed in no particular order. Names are trademarks of their respective owners.</p>
        </section>
        <MoneyFlowSection />
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="pub-display text-2xl md:text-3xl mb-6 text-center">Common questions</h2>
            <div className="space-y-4">
              {QUESTIONS.map((x) => (
                <div key={x.q} className="pub-card p-5">
                  <h3 className="font-bold mb-1">{x.q}</h3>
                  <p className="text-sm pub-muted">{x.a}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/create-club" className="pub-btn">Start free trial <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
