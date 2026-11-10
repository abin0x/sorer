import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import ProvisionClubPanel from "@/components/saas/signup/ProvisionClubPanel";

/** System owner's single entry point: "Invite club". */
export default function InviteClubDialog({ onInvited }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-white text-indigo-700 hover:bg-indigo-50"><UserPlus className="w-4 h-4" /> Invite club</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="sr-only">Invite club</DialogTitle></DialogHeader>
        <ProvisionClubPanel onProvisioned={() => { setOpen(false); onInvited?.(); }} />
      </DialogContent>
    </Dialog>
  );
}