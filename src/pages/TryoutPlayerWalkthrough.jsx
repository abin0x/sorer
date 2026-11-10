import React from "react";
import { withExtras, PLAYER_TRYOUT_EXTRAS } from "@/components/walkthrough/extraSteps";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { PLAYER_TRYOUT_STEPS } from "@/components/walkthrough/tryoutSteps";

export default function TryoutPlayerWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Tryouts Tour for Players & Families | Club Rudder", description: "See how families register for tryouts, get their bib, accept a team offer and join the roster in Club Rudder." }}
      eyebrow="Interactive tour · Tryouts · Players & families"
      title="From tryout sign-up to joining the team"
      intro="Seven short steps showing what a Demo FC family sees. Sample data only."
      device="phone"
      steps={withExtras(PLAYER_TRYOUT_STEPS, PLAYER_TRYOUT_EXTRAS)}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
