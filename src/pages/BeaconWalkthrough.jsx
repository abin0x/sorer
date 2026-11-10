import React from "react";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { BEACON_STEPS } from "@/components/walkthrough/moduleSteps";

export default function BeaconWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Beacon Communication Tour | Club Rudder", description: "See how Beacon keeps families, coaches and staff informed with alerts, announcements and team chat." }}
      eyebrow="Interactive tour · Beacon communication"
      title="Keep everyone in the loop with Beacon"
      intro="Seven short steps, shown the way parents, players and coaches see Beacon on their phones. Demo FC sample data."
      device="phone"
      steps={BEACON_STEPS}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
