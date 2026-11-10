import React from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export default function PriorityConfirmDialog({ open, onOpenChange, audienceSize, onConfirm, remainingToday }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Send as Urgent?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This alerts <strong>{audienceSize}</strong> {audienceSize === 1 ? "person" : "people"} right away by notification, email and text (where set up). It breaks through mute and quiet hours.
            Use it for schedule changes, cancellations, or safety notices — not routine updates.
            {typeof remainingToday === "number" && (
              <span className="block mt-2 text-xs">{remainingToday} urgent alert{remainingToday === 1 ? "" : "s"} left today.</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-amber-500 hover:bg-amber-600 text-white">
            Send Urgent to {audienceSize}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}