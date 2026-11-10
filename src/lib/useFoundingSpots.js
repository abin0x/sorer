import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FOUNDING_CLUB_TOTAL } from "@/lib/pricingCalculator";

/** Single shared request for founding spots so every public page agrees. */
let pending = null;
let cached = null;

function load() {
  if (!pending) {
    pending = base44.functions
      .invoke("get-founding-spots", {})
      .then((res) => {
        if (typeof res?.data?.spots_left === "number") cached = { left: res.data.spots_left, total: res.data.total };
        return cached;
      })
      .catch(() => cached);
  }
  return pending;
}

export function useFoundingInfo() {
  const [info, setInfo] = useState(cached ?? { left: FOUNDING_CLUB_TOTAL, total: FOUNDING_CLUB_TOTAL });
  useEffect(() => {
    let alive = true;
    load().then((v) => { if (alive && v) setInfo(v); });
    return () => { alive = false; };
  }, []);
  return info;
}

export default function useFoundingSpots() {
  return useFoundingInfo().left;
}
