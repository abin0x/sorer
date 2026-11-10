import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiError, billingApi } from "@/lib/facilityBillingApi";

const EMPTY = {
  name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  default_hourly_rate: "",
  payment_terms_days: "30",
  status: "active",
  notes: "",
};

export default function BillingEntityDialog({ open, onOpenChange, entity, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      entity
        ? {
            ...EMPTY,
            ...entity,
            default_hourly_rate: entity.default_hourly_rate ?? "",
            payment_terms_days: entity.payment_terms_days ?? "30",
          }
        : EMPTY
    );
  }, [open, entity]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const bind = (key) => (e) => setField(key, e.target.value);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Please enter the organization's name.");
    if (!form.contact_email.trim()) return toast.error("A billing contact email is required — invoices are emailed there.");

    setSaving(true);
    try {
      await billingApi({
        action: "save_entity",
        entity_id: entity?.id,
        name: form.name,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        address: form.address,
        default_hourly_rate: Number(form.default_hourly_rate) || 0,
        payment_terms_days: Number(form.payment_terms_days) || 30,
        status: form.status,
        notes: form.notes,
      });
      toast.success(entity ? "Billing organization updated." : "Billing organization added.");
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(apiError(error, "Could not save this organization."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entity ? "Edit Billing Organization" : "New Billing Organization"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Organization name *</Label>
            <Input value={form.name} onChange={bind("name")} placeholder="Northville United SC" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Billing contact</Label>
              <Input value={form.contact_name} onChange={bind("contact_name")} placeholder="Full name" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input type="tel" value={form.contact_phone} onChange={bind("contact_phone")} placeholder="(555) 555-5555" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Billing email *</Label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={bind("contact_email")}
              placeholder="billing@club.org"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Invoices are emailed here, and signing in with this address opens the organization's invoice portal.
            </p>
          </div>
          <div>
            <Label className="text-xs">Billing address</Label>
            <Textarea value={form.address} onChange={bind("address")} className="min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Default hourly rate</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.default_hourly_rate}
                onChange={bind("default_hourly_rate")}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-xs">Payment terms (days)</Label>
              <Input
                type="number"
                min="0"
                value={form.payment_terms_days}
                onChange={bind("payment_terms_days")}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Internal notes</Label>
            <Textarea
              value={form.notes}
              onChange={bind("notes")}
              className="min-h-[50px]"
              placeholder="Never shown in the portal"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : entity ? "Save Changes" : "Add Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}