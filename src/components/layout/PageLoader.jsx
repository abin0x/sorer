import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Fallback shown while a route's code chunk is being fetched (route-level code
 * splitting). Kept intentionally light so it paints instantly.
 */
export default function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24" role="status" aria-live="polite">
      <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}