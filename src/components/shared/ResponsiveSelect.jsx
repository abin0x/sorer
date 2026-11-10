import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Drawer select — the app-wide replacement for native <select> elements.
 *
 * - Mobile: tapping the trigger slides a bottom-sheet drawer up from the bottom
 *   of the screen, holding a scrollable list of options (44px minimum row
 *   height), a checkmark on the current choice and a visible Cancel button. It
 *   closes on option tap, on backdrop tap, on Cancel and on the platform back
 *   gesture.
 * - Desktop: the same list in an anchored popover instead of a native select,
 *   so the control looks identical everywhere.
 *
 * Accessibility: the trigger is a labelled button (aria-label / aria-haspopup /
 * aria-expanded); the list is role="listbox" with role="option" items carrying
 * aria-selected. Focus is trapped while open and returns to the trigger on
 * close (Radix dialog / modal popover), and the list is keyboard driven
 * (arrows, Home/End, Enter, Escape).
 */
export default function ResponsiveSelect({
  value,
  onChange,
  options = [],
  placeholder = "",
  label,
  ariaLabel,
  className = "",
  disabled = false,
  id,
  autoFocus = false,
  autoOpen = false,
  onDismiss,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef(null);
  const optionRefs = useRef([]);
  const pushedRef = useRef(false);
  const listId = useId();
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = items.find((o) => o.value === value);
  const fieldLabel = label || placeholder || "Select an option";
  const triggerLabel = ariaLabel || label || placeholder || undefined;

  const showList = () => {
    setHighlighted(Math.max(items.findIndex((o) => o.value === value), 0));
    setOpen(true);
  };

  const dismiss = () => {
    setOpen(false);
    onDismiss?.();
  };

  // Inline editors open the list straight away — the tap already happened.
  useEffect(() => {
    if (autoOpen) showList();
  }, [autoOpen]);

  // Platform back gesture closes the drawer instead of leaving the page.
  useEffect(() => {
    if (!open) return;
    const key = window.location.pathname + window.location.search;
    window.history.pushState({ __selectDrawer: true }, "");
    pushedRef.current = true;
    const onPop = () => {
      pushedRef.current = false;
      dismiss();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Drop our history entry again, unless the route already changed.
      const stillHere = window.location.pathname + window.location.search === key;
      if (pushedRef.current && stillHere) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [open]);

  // Keyboard focus lives on the list, which follows the highlighted option.
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    optionRefs.current[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  const choose = (option) => {
    setOpen(false);
    if (option.value !== value) onChange(option.value);
  };

  const onListKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlighted(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlighted(items.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (items[highlighted]) choose(items[highlighted]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      dismiss();
    }
  };

  const list = (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={fieldLabel}
      tabIndex={0}
      onKeyDown={onListKeyDown}
      className="flex-1 overflow-y-auto py-1 min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {items.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">No options available.</p>}
      {items.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={`${o.value}-${i}`}
            ref={(el) => { optionRefs.current[i] = el; }}
            type="button"
            role="option"
            aria-selected={active}
            tabIndex={-1}
            onClick={() => choose(o)}
            className={cn(
              "w-full min-h-[44px] px-4 flex items-center justify-between gap-3 text-left text-sm",
              highlighted === i && "bg-muted",
              active ? "text-primary font-semibold" : "text-foreground"
            )}
          >
            <span className="truncate">{o.label}</span>
            {active && <Check className="w-5 h-5 shrink-0" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );

  const trigger = (
    <button
      type="button"
      id={id}
      disabled={disabled}
      autoFocus={autoFocus}
      onClick={isMobile ? showList : undefined}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={triggerLabel}
      className={cn(
        "inline-flex items-center justify-between gap-2 px-3 text-sm border border-border rounded-md bg-card text-foreground text-left",
        isMobile && "min-h-[44px]",
        className
      )}
    >
      <span className="truncate">{selected ? selected.label : placeholder || "Select…"}</span>
      <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={(v) => (v ? showList() : dismiss())}>
          <SheetContent side="bottom" className="p-0 rounded-t-2xl max-h-[80dvh] flex flex-col">
            <SheetTitle className="px-4 py-3 text-sm font-bold text-left border-b border-border">
              {fieldLabel}
            </SheetTitle>
            {list}
            <div className="safe-bottom p-3 border-t border-border">
              <Button variant="outline" className="w-full min-h-[44px]" onClick={dismiss}>Cancel</Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover modal open={open} onOpenChange={(v) => (v ? showList() : open && dismiss())}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="p-3 w-[var(--radix-popover-trigger-width)] min-w-[200px] max-h-[min(70vh,420px)] flex flex-col gap-2"
      >
        <p className="text-xs font-semibold text-muted-foreground border-b border-border pb-2">{fieldLabel}</p>
        {list}
        <Button variant="outline" className="w-full" onClick={dismiss}>Cancel</Button>
      </PopoverContent>
    </Popover>
  );
}