import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ValidationErrorDialog({ open, onOpenChange, errors = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">Required Fields Missing</DialogTitle>
              <DialogDescription>
                Please fill in all required fields to continue
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-2 my-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            The following fields are required:
          </p>
          <ul className="space-y-2">
            {errors.map((error, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}