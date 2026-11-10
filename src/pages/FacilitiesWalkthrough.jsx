import React from "react";
import { withExtras, FACILITY_EXTRAS } from "@/components/walkthrough/extraSteps";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { FACILITY_STEPS } from "@/components/walkthrough/moduleSteps";

export default function FacilitiesWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Facilities & Fields Tour | Club Rudder", description: "See how clubs manage fields, bookings and closures across every location in Club Rudder." }}
      eyebrow="Interactive tour · Facilities & fields"
      title="Run every field at every location"
      intro="Seven short steps with Demo FC sample data."
      device="tablet"
      steps={withExtras(FACILITY_STEPS, FACILITY_EXTRAS)}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
