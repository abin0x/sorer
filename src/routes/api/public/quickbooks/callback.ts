import { createFileRoute } from "@tanstack/react-router";

// Intuit sends the club admin back here after they approve access.
export const Route = createFileRoute("/api/public/quickbooks/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => (await import("@/lib/oauthCallback.server")).handleOAuthCallback(request),
    },
  },
});
