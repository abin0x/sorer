import React from "react";
import { withExtras, PROJECTS_EXTRAS } from "@/components/walkthrough/extraSteps";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { PROJECTS_STEPS } from "@/components/walkthrough/addonSteps";

export default function ProjectsWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Projects & Reports Tour | Club Rudder", description: "See how club staff manage projects, programs, dashboards and scheduled reports." }}
      eyebrow="Interactive tour · Projects & reports"
      title="Keep your staff and board on the same page"
      intro="Admin screens on iPad, coach and family screens on phone. Demo FC sample data."
      device="tablet"
      steps={withExtras(PROJECTS_STEPS, PROJECTS_EXTRAS)}
      other={{ label: "See all our tours", to: "/walkthrough", cta: "Back to all tours" }}
    />
  );
}
