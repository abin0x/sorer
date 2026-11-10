import React from "react";
import ComparePage from "@/components/compare/ComparePage";
import { COMPARE_PAGES } from "@/lib/compare/comparePages";

export default function TeamSnapAlternative() {
  return <ComparePage data={COMPARE_PAGES.teamsnap} />;
}