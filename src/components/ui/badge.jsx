import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

// All variants use WCAG-AA-compliant color tokens (4.5:1+):
//  default     → --action-primary / --action-primary-text (auto-darkened via
//                ensureAccessiblePair in tenantBranding.js)
//  destructive → --danger-500 (#DC2626) with white text (4.90:1)
//  success     → --success-50 / --success-700 (7.84:1)
//  warning     → --warning-50 / --warning-700 (5.15:1)
//  info        → --info-50 / --info-700 (9.16:1)
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-action text-action-text shadow hover:bg-action-hover",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-status-danger text-neutral-0 shadow hover:bg-status-danger-700",
        success:
          "border-transparent bg-status-success-50 text-status-success-700",
        warning:
          "border-transparent bg-status-warning-50 text-status-warning-700",
        info:
          "border-transparent bg-status-info-50 text-status-info-700",
        outline: "text-foreground border-border-subtle",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }