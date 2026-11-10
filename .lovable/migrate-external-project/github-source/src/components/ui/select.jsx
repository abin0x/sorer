"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"

/**
 * The mobile sheet's own controls (its Cancel button and the platform back
 * gesture) must be able to close the list, so the open state lives here in the
 * wrapper, where both can reach it. Uncontrolled by default; a caller that
 * passes `open` keeps full control.
 */
const SelectSheetContext = React.createContext({ isMobile: false, isOpen: false, close: () => {} })

const Select = ({ defaultOpen = false, open, onOpenChange, ...props }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolledOpen
  const isMobile = useIsMobile()

  const handleOpenChange = (next) => {
    if (!isControlled) setUncontrolledOpen(next)
    if (onOpenChange) onOpenChange(next)
  }

  const close = React.useCallback(() => {
    if (!isControlled) setUncontrolledOpen(false)
    if (onOpenChange) onOpenChange(false)
  }, [isControlled, onOpenChange])

  return (
    <SelectSheetContext.Provider value={{ isMobile, isOpen, close }}>
      <SelectPrimitive.Root {...props} open={isOpen} onOpenChange={handleOpenChange} />
    </SelectSheetContext.Provider>
  )
}
Select.displayName = "Select"

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const { isMobile, isOpen, close } = React.useContext(SelectSheetContext)
  const pushedRef = React.useRef(false)

  // Platform back gesture closes the sheet instead of leaving the page.
  React.useEffect(() => {
    if (!isMobile || !isOpen) return
    const key = window.location.pathname + window.location.search
    window.history.pushState({ __selectSheet: true }, "")
    pushedRef.current = true
    const onPop = () => {
      pushedRef.current = false
      close()
    }
    window.addEventListener("popstate", onPop)
    return () => {
      window.removeEventListener("popstate", onPop)
      // Drop our history entry again, unless the route already changed.
      const stillHere = window.location.pathname + window.location.search === key
      if (pushedRef.current && stillHere) {
        pushedRef.current = false
        window.history.back()
      }
    }
  }, [isMobile, isOpen])

  // Mobile: a bottom sheet that slides up from the bottom edge.
  // Radix positions this element inline as a popper, so the sheet layout is
  // forced with !important, and the slide-up animation lives on the inner
  // surface so the two don't fight over `transform`.
  if (isMobile) {
    return (
      <SelectPrimitive.Portal>
        {/* Backdrop — tapping it dismisses (Radix closes on outside press). */}
        <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" />
        <SelectPrimitive.Content
          ref={ref}
          position="popper"
          className={cn(
            "!fixed !inset-x-0 !bottom-0 !top-auto !left-0 !w-full !max-w-none !min-w-0 !transform-none !max-h-none !overflow-visible !border-0 !bg-transparent !p-0 !shadow-none z-50",
            className
          )}
          {...props}>
          <div className="sheet-slide-up flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-popover text-popover-foreground shadow-2xl">
            <SelectScrollUpButton />
            <SelectPrimitive.Viewport className="p-1 max-h-[60dvh] overflow-y-auto overscroll-contain">
              {children}
            </SelectPrimitive.Viewport>
            <SelectScrollDownButton />
            <div className="safe-bottom p-4 border-t border-border">
              <Button variant="outline" className="w-full min-h-[44px]" onClick={close}>
                Cancel
              </Button>
            </div>
          </div>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    )
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => {
  const { isMobile } = React.useContext(SelectSheetContext)
  return (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      // Touch: 44px rows in the sheet (the selected row keeps its checkmark).
      isMobile && "min-h-[44px] rounded-lg pl-4 pr-10",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
  )
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}