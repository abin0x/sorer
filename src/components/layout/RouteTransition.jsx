import React, { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from '@/lib/router-compat';
import { isDrillDownPath } from "@/lib/drilldownRoutes";

/**
 * Wraps the routed view with the drill-down slide:
 *
 *   list → detail   the detail view slides in from the right  (route-slide-forward)
 *   detail → back    the list view slides in from the left, which reads as the
 *                    detail view leaving to the right         (route-slide-back)
 *
 * Anything else — bottom-tab switches, dashboards, lateral navigation — keeps
 * the plain fade, so the bottom tab bar and the back stack are untouched.
 *
 * The router reports POP for the browser/hardware back button, which is what
 * drives the back direction; the previous path is kept in a ref because this
 * component stays mounted across navigations (only the inner, keyed div
 * remounts, which restarts the CSS animation). No JS animation loop runs.
 */
export default function RouteTransition({ children }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(location.pathname);
  const cameFrom = previousPath.current;

  useEffect(() => {
    previousPath.current = location.pathname;
  }, [location.pathname]);

  const enteringDetail = isDrillDownPath(location.pathname);
  const leavingDetail = navigationType === "POP" && isDrillDownPath(cameFrom);

  let className = "route-fade";
  if (enteringDetail) className = "route-slide-forward";
  else if (leavingDetail) className = "route-slide-back";

  return (
    <div key={location.pathname} className={className}>
      {children}
    </div>
  );
}