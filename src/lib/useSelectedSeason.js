import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { pickLifecycleSeason } from "@/lib/seasonLifecycle";

/**
 * Club-scoped selected season, persisted in localStorage so dashboards,
 * calendar, and payments all default to the same season the admin picked
 * on the Seasons page. Falls back to the lifecycle season when none is chosen.
 */
export function useSelectedSeason() {
  const { effectiveClubId } = useTenant();
  const key = `selected-season-${effectiveClubId || "system"}`;
  const [storedId, setStoredId] = useState(() => {
    try { return localStorage.getItem(key); } catch { return null; }
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons"],
    queryFn: () => base44.entities.Season.list("-created_date"),
  });

  const selected = seasons.find((s) => s.id === storedId) || pickLifecycleSeason(seasons);

  const setSelectedSeason = useCallback((id) => {
    try {
      if (id) localStorage.setItem(key, id);
      else localStorage.removeItem(key);
    } catch { /* ignore */ }
    setStoredId(id);
  }, [key]);

  return { seasons, selected, setSelectedSeason };
}