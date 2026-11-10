import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";

/**
 * "Book a demo" dialog — collects contact info and creates a DemoAccessRequest
 * so the team can schedule a call. This is the scheduler stand-in until a
 * Calendly (or similar) connector is wired up.
 */
export default function BookDemoDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ name: "", email: "", club_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.DemoAccessRequest.create({
        name: form.name,
        email: form.email,
        club_name: form.club_name,
        message: form.phone ? `Phone: ${form.phone}` : "",
        status: "pending",
        source: "request",
      });
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  const close = (next) => {
    onOpenChange(next);
    if (!next) {
      setDone(false);
      setForm({ name: "", email: "", club_name: "", phone: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-1">Thanks — we'll be in touch!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">We'll reach out to {form.email} to schedule your demo.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Book a demo</DialogTitle>
              <DialogDescription>Tell us about your club and we'll schedule a personalized walkthrough.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="bd-name">Your name</Label>
                <Input id="bd-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="bd-email">Email</Label>
                <Input id="bd-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="bd-club">Club name</Label>
                <Input id="bd-club" required value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="bd-phone">Phone (optional)</Label>
                <Input id="bd-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request my demo"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}