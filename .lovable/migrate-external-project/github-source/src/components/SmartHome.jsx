import React, { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";

// Lazy-load dashboard pages so the initial bundle stays small and fast on mobile.
const SaaSAdmin = React.lazy(() => import("@/pages/SaaSAdmin"));
const RoleDashboard = React.lazy(() => import("@/pages/RoleDashboard"));
const MyJourney = React.lazy(() => import("@/pages/MyJourney"));

const PageFallback = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action" />
  </div>
);

/**
 * Routes the home page based on tenant context:
 *  - System users on the system domain (clubrudder.com) → System Console (SaaSAdmin)
 *  - Logged-in users with no club yet (prospects/leads) → their journey dashboard
 *  - Everyone else → role-based dashboard (club-scoped)
 */
export default function SmartHome() {
  const { isSystemDomain, isSystemUser, viewingTenant, loading } = useTenant();
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["smartHomeUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action" />
      </div>
    );
  }

  if (isSystemDomain && isSystemUser && !viewingTenant) return <Suspense fallback={<PageFallback />}><SaaSAdmin /></Suspense>;
  if (user && !user.club_id && !isSystemUser && user.role !== "admin") return <Suspense fallback={<PageFallback />}><MyJourney /></Suspense>;
  return <Suspense fallback={<PageFallback />}><RoleDashboard /></Suspense>;
}