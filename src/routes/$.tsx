import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const LegacyApp = lazy(() => import("@/LegacyApp.jsx"));

export const Route = createFileRoute("/$")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `${params._splat?.split("/").filter(Boolean).join(" · ") || "Workspace"} — ClubRudder` },
      { name: "description", content: "ClubRudder — run every branch, team, player and finance of your soccer club in one place." },
      { property: "og:title", content: `${params._splat?.split("/").filter(Boolean).join(" · ") || "Workspace"} — ClubRudder` },
      { property: "og:description", content: `Explore ${params._splat?.split("/").filter(Boolean).join(" ") || "your workspace"} in ClubRudder, the multi-branch soccer club management platform.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <Suspense fallback={null}>
      <LegacyApp />
    </Suspense>
  ),
});
