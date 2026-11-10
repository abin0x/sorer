import React from "react";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { ADMIN_TRYOUT_STEPS } from "@/components/walkthrough/tryoutSteps";

export default function TryoutAdminWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Tryouts Tour for Club Admins | Club Rudder", description: "See how club directors set up tryouts, check players in, build rosters and send offers in Club Rudder." }}
      eyebrow="Interactive tour · Tryouts · Admin"
      title="Run tryouts from sign-up to team offers"
      intro="Seven short steps showing how a Demo FC director runs tryouts. Sample data only."
      device="tablet"
      steps={ADMIN_TRYOUT_STEPS}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
