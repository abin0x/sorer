import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function GetQuoteDialog({ open, onOpenChange, quoteData }) {
  const [form, setForm] = useState({ contact_name: "", contact_email: "", club_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.PricingQuote.create({ ...quoteData, ...form });
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  const close = (next) => {
    onOpenChange(next);
    if (!next) {
      setDone(false);
      setForm({ contact_name: "", contact_email: "", club_name: "", phone: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-1">Demo request sent!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">We'll be in touch at {form.contact_email} to schedule your demo.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Book a demo</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="club_name">Club name</Label>
                <Input id="club_name" required value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="contact_name">Your name</Label>
                <Input id="contact_name" required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" type="email" required value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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