import React from "react";
import { useNavigate } from '@/lib/router-compat';
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one header every sub-page / detail view uses.
 *
 * The back button walks the real browser history (navigate(-1) === history.back()),
 * which is exactly what the Android hardware back button does — so both return to
 * the previous page in the stack instead of dropping the user out of the app.
 * Only when there is no previous entry (someone deep-linked straight into the
 * detail view) does it fall back to `backTo`, replaced rather than pushed so the
 * stack never grows a loop.
 */
export default function SubPageHeader({ title, subtitle, backTo = "/home", actions, className }) {
  const navigate = useNavigate();

  const goBack = () => {
    const idx = window.history.state?.idx;
    const hasPrevious = typeof idx === "number" ? idx > 0 : window.history.length > 1;
    if (hasPrevious) navigate(-1);
    else navigate(backTo, { replace: true });
  };

  return (
    <div className={cn("sticky top-0 z-20 flex items-center gap-2 px-4 py-2 bg-background/95 backdrop-blur border-b border-border", className)}>
      <button
        type="button"
        onClick={goBack}
        aria-label="Go back"
        className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 select-none"
      >
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        <span className="hidden sm:inline">Back</span>
      </button>

      {(title || subtitle) && (
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-foreground text-base leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      )}

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}