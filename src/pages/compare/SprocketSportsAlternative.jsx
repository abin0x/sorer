import React from "react";
import ComparePage from "@/components/compare/ComparePage";
import { COMPARE_PAGES } from "@/lib/compare/comparePages";

export default function SprocketSportsAlternative() {
  return <ComparePage data={COMPARE_PAGES.sprocket} />;
}