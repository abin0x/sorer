import React from "react";
import { withExtras, PAYMENTS_EXTRAS } from "@/components/walkthrough/extraSteps";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { PAYMENTS_STEPS } from "@/components/walkthrough/addonSteps";

export default function PaymentsWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Payments, Store & Expenses Tour | Club Rudder", description: "See how clubs sell gear and camps, run paid events and approve coach expenses that sync to QuickBooks." }}
      eyebrow="Interactive tour · Payments & store"
      title="Sell, collect and approve — all in one place"
      intro="Admin screens on iPad, coach and family screens on phone. Demo FC sample data."
      device="tablet"
      steps={withExtras(PAYMENTS_STEPS, PAYMENTS_EXTRAS)}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
