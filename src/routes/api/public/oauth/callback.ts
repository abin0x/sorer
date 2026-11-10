import { createFileRoute } from "@tanstack/react-router";

// Google, Meta, X and LinkedIn return here. State is verified and consumed server-side.
export const Route = createFileRoute("/api/public/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => (await import("@/lib/oauthCallback.server")).handleOAuthCallback(request),
    },
  },
});
