import React from "react";
import { withExtras, COACH_TRYOUT_EXTRAS } from "@/components/walkthrough/extraSteps";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { COACH_TRYOUT_STEPS } from "@/components/walkthrough/tryoutSteps";

export default function TryoutCoachWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Tryouts Tour for Coaches | Club Rudder", description: "See how coaches and evaluators score players at tryouts on their phone in Club Rudder." }}
      eyebrow="Interactive tour · Tryouts · Coach & evaluator"
      title="Score players right from the field"
      intro="Seven short steps showing what a Demo FC coach sees at tryouts. Sample data only."
      device="phone"
      steps={withExtras(COACH_TRYOUT_STEPS, COACH_TRYOUT_EXTRAS)}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
