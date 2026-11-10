import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function StaffContactDialog({ open, onOpenChange, user, onSend }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      setSubject("");
      setMessage("");
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend({ to: user?.email, subject, body: message });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Contact {user?.full_name || user?.email || "Staff"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>To</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required className="resize-none" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Send Message</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}