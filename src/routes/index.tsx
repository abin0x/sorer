import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const LegacyApp = lazy(() => import("@/LegacyApp.jsx"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ClubRudder — Soccer club operating system" },
      { name: "description", content: "Manage branches, teams, players, payments and bookkeeping for multi-location soccer clubs." },
      { property: "og:title", content: "ClubRudder — Soccer club operating system" },
      { property: "og:description", content: "Manage branches, teams, players, payments and bookkeeping for multi-location soccer clubs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://clubrudder.com/" },
    ],
    links: [{ rel: "canonical", href: "https://clubrudder.com/" }],
  }),
  component: () => (
    <Suspense fallback={null}>
      <LegacyApp />
    </Suspense>
  ),
});
