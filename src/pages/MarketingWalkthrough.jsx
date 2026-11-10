import React from "react";
import { withExtras, MARKETING_EXTRAS } from "@/components/walkthrough/extraSteps";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { MARKETING_STEPS } from "@/components/walkthrough/addonSteps";

export default function MarketingWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Marketing & Website Tour | Club Rudder", description: "See how clubs run their website, campaigns and social posts from Club Rudder." }}
      eyebrow="Interactive tour · Marketing & website"
      title="Grow your club with less effort"
      intro="Admin screens on iPad, coach and family screens on phone. Demo FC sample data."
      device="tablet"
      steps={withExtras(MARKETING_STEPS, MARKETING_EXTRAS)}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
