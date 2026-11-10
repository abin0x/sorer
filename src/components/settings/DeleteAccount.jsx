import React, { useState } from "react";
import { Trash2, AlertTriangle, Loader2, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const CONFIRM_PHRASE = "DELETE";

/**
 * Account deletion flow: a danger zone card with a confirmation modal.
 * Calls the `delete-account` backend function (service-role self-delete),
 * then logs the user out and redirects to the public landing page.
 */
export default function DeleteAccount({ user }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Platform console accounts are managed from the SaaS console, not self-serve.
  const isPlatformAdmin =
    user?.is_super_admin === true || String(user?.system_role || "").startsWith("system_");

  const handleDelete = async () => {
    if (isPlatformAdmin) {
      toast({
        title: "Action unavailable",
        description: "Platform console accounts must be removed by another platform admin.",
        variant: "destructive",
      });
      return;
    }
    setDeleting(true);
    try {
      await base44.functions.invoke("delete-account", {});
      toast({ title: "Account deleted", description: "Your account has been permanently removed." });
      // Clear local session and redirect to the public landing page.
      setTimeout(() => {
        base44.auth.logout("/");
      }, 800);
    } catch (err) {
      setDeleting(false);
      toast({
        title: "Could not delete account",
        description: err?.response?.data?.error || err?.message || "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setConfirmText("");
    setDeleting(false);
  };

  return (
    <>
      <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900 p-5 select-none">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 dark:text-red-300">Delete Account</h3>
            <p className="text-sm text-red-700/80 dark:text-red-400/80 mt-1">
              Permanently delete your account and the personal data attached to it. This action
              cannot be undone.
              {isPlatformAdmin && " Platform console accounts must be removed by another platform admin."}
            </p>
            <p className="text-xs text-red-700/70 dark:text-red-400/70 mt-2">
              Deleting the account will not cancel App Store subscriptions. Please manage or cancel
              in system settings.
            </p>
            <Button
              variant="destructive"
              className="mt-4 select-none min-h-[44px]"
              onClick={() => setOpen(true)}
              disabled={isPlatformAdmin}
            >
              <Trash2 className="w-4 h-4" />
              Delete my account
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
        <DialogContent className="select-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Delete your account?
            </DialogTitle>
            <DialogDescription className="pt-2">
              This permanently deletes your account and the personal data attached to it, including
              your notification preferences, notifications and any pending invitations. You will be
              signed out immediately and will not be able to recover your account. Your club keeps
              its roster, registration and payment records. To confirm, type{" "}
              <span className="font-mono font-bold text-red-700 dark:text-red-400">{CONFIRM_PHRASE}</span>{" "}
              below.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              Deleting the account will not cancel App Store subscriptions. Please manage or cancel
              in system settings.
            </p>
          </div>

          <div className="space-y-2 py-2">
            <Label htmlFor="delete-confirm" className="text-sm font-medium">
              Type {CONFIRM_PHRASE} to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              className="select-text"
              disabled={deleting}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={deleting} className="select-none min-h-[44px]">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== CONFIRM_PHRASE || deleting}
              className="select-none min-h-[44px]"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Permanently delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}