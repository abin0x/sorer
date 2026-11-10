import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FOUNDING_CLUB_TOTAL } from "@/lib/pricingCalculator";

/**
 * Single source for the founding-spots number shown on every public page.
 * One request is shared by all components, so Home, Why, Pricing and the
 * calculator can never disagree with each other.
 */
let pending = null;
let cached = null;

function load() {
  if (!pending) {
    pending = base44.functions
      .invoke("get-founding-spots", {})
      .then((res) => {
        if (typeof res?.data?.spots_left === "number") cached = res.data.spots_left;
        return cached;
      })
      .catch(() => cached);
  }
  return pending;
}

export default function useFoundingSpots() {
  const [spotsLeft, setSpotsLeft] = useState(cached ?? FOUNDING_CLUB_TOTAL);

  useEffect(() => {
    let alive = true;
    load().then((n) => {
      if (alive && typeof n === "number") setSpotsLeft(n);
    });
    return () => {
      alive = false;
    };
  }, []);

  return spotsLeft;
}