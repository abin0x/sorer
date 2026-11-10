import React from "react";
import { withExtras, DEVELOPMENT_EXTRAS } from "@/components/walkthrough/extraSteps";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { DEVELOPMENT_STEPS } from "@/components/walkthrough/moduleSteps";

export default function DevelopmentWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Player Development Tour | Club Rudder", description: "See how Club Rudder tracks player growth, goals and support across seasons." }}
      eyebrow="Interactive tour · Player development & support"
      title="Help every player grow"
      intro="Seven short steps with Demo FC sample data."
      device="tablet"
      steps={withExtras(DEVELOPMENT_STEPS, DEVELOPMENT_EXTRAS)}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
