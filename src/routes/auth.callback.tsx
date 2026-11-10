import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Signing in — ClubRudder" },
    { name: "description", content: "Complete secure sign-in to your ClubRudder workspace." },
    { property: "og:title", content: "Signing in — ClubRudder" },
    { property: "og:description", content: "Complete secure sign-in to your ClubRudder workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthCallback,
});

function AuthCallback() {
  const [msg, setMsg] = useState("Finishing sign-in…");
  useEffect(() => {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get("returnTo") || "/home";
    const hash = new URLSearchParams(url.hash.slice(1));
    const payload = {
      type: "cr-oauth",
      access_token: hash.get("access_token"),
      refresh_token: hash.get("refresh_token"),
      code: url.searchParams.get("code"),
      error: hash.get("error_description") || url.searchParams.get("error_description"),
    };
    // Opened as a popup from the preview: hand the session back and close.
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
      setMsg("Signed in. You can close this window.");
      setTimeout(() => window.close(), 300);
      return;
    }
    // Normal full-page flow.
    (async () => {
      if (payload.access_token && payload.refresh_token) {
        await supabase.auth.setSession({ access_token: payload.access_token, refresh_token: payload.refresh_token });
      } else if (payload.code) {
        await supabase.auth.exchangeCodeForSession(payload.code).catch(() => {});
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.replace(returnTo.startsWith("/") ? returnTo : "/home");
      else setMsg(payload.error || "Sign-in failed. Please try again.");
    })();
  }, []);
  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{msg}</div>;
}
