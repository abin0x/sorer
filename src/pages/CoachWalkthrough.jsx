import React from "react";
import { withExtras, COACH_DAY_EXTRAS } from "@/components/walkthrough/extraSteps";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { COACH_DAY_STEPS } from "@/components/walkthrough/addonSteps";

export default function CoachWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Coach's Day Tour | Club Rudder", description: "See how coaches run practices, attendance and game RSVPs from their phone." }}
      eyebrow="Interactive tour · Coaches"
      title="A coach's day, all on their phone"
      intro="Admin screens on iPad, coach and family screens on phone. Demo FC sample data."
      device="phone"
      steps={withExtras(COACH_DAY_STEPS, COACH_DAY_EXTRAS)}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
