import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FOUNDING_OFFER_ENDS } from "@/lib/pricingCalculator";

const FAQS = [
  {
    q: "Are there per-transaction fees?",
    a: "No. Payments go straight to your own Stripe (or Square) account — Club Rudder takes no cut of any family payment. Standard processor fees from Stripe still apply; we just don't add our own on top.",
  },
  {
    q: "What's included in every plan?",
    a: "Every tier includes registration & tryouts, messaging & channels, calendars & scheduling, club dues payments, and two-way QuickBooks sync. The marketplace, events management, spiritwear store, and staff and vendor invoicing are unlocked by the Storefront & Bookkeeping module; the other five add-on modules are optional and stack with volume discounts.",
  },
  {
    q: "How does the founding offer work?",
    a: `The first 10 live clubs get their entire setup fee waived, and their per-player and module rates are locked through ${FOUNDING_OFFER_ENDS}, so no price increase for about three years. Once the 10 spots are taken, standard setup fees apply.`,
  },
  {
    q: "Can I change tiers as my club grows?",
    a: "Yes. Grow into the next tier anytime — your rates simply switch to that tier's setup and per-player rates. No re-setup, no downtime.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 30 days, no credit card required. You can build your club, explore every module, and migrate your data before you pay anything.",
  },
  {
    q: "How does migration work?",
    a: "Upload your export from any platform. Our system maps and cleans your data, then a Club Rudder specialist verifies every migration before you go live — and we fix anything we miss at no cost.",
  },
];

export default function PricingFAQ() {
  return (
    <Accordion type="single" collapsible className="max-w-3xl mx-auto">
      {FAQS.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="text-left font-bold text-slate-900 dark:text-white">{item.q}</AccordionTrigger>
          <AccordionContent className="text-slate-600 dark:text-slate-300">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}