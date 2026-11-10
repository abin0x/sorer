import { useMemo } from "react";
import { useTenant } from "@/lib/TenantContext";
import { mergeTerminology } from "@/lib/terminology";

/** The active club's vocabulary (viewed club first, then the user's own). */
export function useTerminology() {
  const tenant = useTenant();
  const saved = (tenant.club || tenant.userClub)?.terminology;
  return useMemo(() => mergeTerminology(saved), [saved]);
}
