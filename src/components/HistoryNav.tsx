import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "@tanstack/react-router";

// Beacon screens have their own bottom tab bar; the pill would cover it.
const HIDDEN = /^\/(beacon|app|gameview)(\/|$)/i;

/** Floating back/forward buttons that move through the pages visited in this tab. */
export default function HistoryNav() {
  const { pathname } = useLocation();
  if (HIDDEN.test(pathname) && !/^\/beacon\/support/i.test(pathname)) return null;
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-primary hover:text-primary-foreground";
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-1 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur print:hidden">
      <button type="button" aria-label="Go back to the last page" title="Back" className={btn} onClick={() => window.history.back()}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label="Go forward" title="Forward" className={btn} onClick={() => window.history.forward()}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
