import React from "react";
import { withExtras, TOURNAMENT_EXTRAS } from "@/components/walkthrough/extraSteps";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { TOURNAMENT_STEPS } from "@/components/walkthrough/addonSteps";

export default function TournamentsWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Tournaments Tour | Club Rudder", description: "See how clubs host tournaments with auto-built schedules, sideline scoring and live standings." }}
      eyebrow="Interactive tour · Tournaments"
      title="Host a tournament without the spreadsheets"
      intro="Admin screens on iPad, coach and family screens on phone. Demo FC sample data."
      device="tablet"
      steps={withExtras(TOURNAMENT_STEPS, TOURNAMENT_EXTRAS)}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
