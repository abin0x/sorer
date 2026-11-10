import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PRICING_CONFIG, normalizePricingConfig } from "@/lib/pricingCalculator";

/** Loads the owner-edited public pricing fields (via a read-only database function), falling back to defaults. */
export default function usePricingConfig() {
  const [config, setConfig] = useState(() => normalizePricingConfig(DEFAULT_PRICING_CONFIG));
  useEffect(() => {
    let alive = true;
    supabase.rpc("get_public_pricing")
      .then(({ data }) => { if (alive && data) setConfig(normalizePricingConfig(data)); })
      .catch?.(() => {});
    return () => { alive = false; };
  }, []);
  return config;
}
