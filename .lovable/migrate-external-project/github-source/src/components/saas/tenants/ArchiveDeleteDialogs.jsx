import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export function ArchiveConfirmDialog({ club, open, onOpenChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {club?.name}?</DialogTitle>
          <DialogDescription>Their site will go offline and the club will be hidden from active tenant lists. You can unarchive later.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Archive Tenant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteConfirmDialog({ club, open, onOpenChange, onConfirm }) {
  const [typed, setTyped] = useState("");
  const match = typed.trim() === (club?.name || "").trim() && typed.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={(v) => { setTyped(""); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently delete {club?.name}?</DialogTitle>
          <DialogDescription>This cannot be undone. Type the club name to confirm.</DialogDescription>
        </DialogHeader>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={club?.name} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={!match} onClick={onConfirm}>Delete Permanently</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}