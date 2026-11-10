import React from "react";
import SubPageHeader from "./SubPageHeader";
import { cn } from "@/lib/utils";

/**
 * Shared layout for every sub-page and detail view: one consistent back-stack
 * header (see SubPageHeader) plus the page content container, so all sub-views
 * look and behave the same.
 */
export default function SubPageLayout({ title, subtitle, backTo, actions, children, className, contentClassName }) {
  return (
    <div className={cn("min-h-full", className)}>
      <SubPageHeader title={title} subtitle={subtitle} backTo={backTo} actions={actions} />
      {/* 16px screen gutter at every width (matches the header), 8px-grid vertical rhythm. */}
      <div className={cn("p-4 sm:py-6", contentClassName)}>{children}</div>
    </div>
  );
}