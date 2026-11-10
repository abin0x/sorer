import React, { useState, useEffect } from "react";
import { Loader2, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSubdomainUrl } from "@/lib/tenantResolver";
import SubdomainField from "./SubdomainField";
import BrandingEditor from "./BrandingEditor";
import { ArchiveConfirmDialog, DeleteConfirmDialog } from "./ArchiveDeleteDialogs";
import { isValidHex } from "./tenantUtils";

const BLANK = {
  name: "", slug: "", app_name: "", billing_email: "", address: "", director_name: "", admin_name: "",
  primary_contact_name: "", primary_contact_email: "", primary_contact_phone: "",
  logo_url: "", primary_color: "#399F7D", secondary_color: "#F59E0B", plan_tier: "starter",
  status: "trialing", internal_notes: "", club_type: "live",
};

export default function TenantEditor({ club, clubs, plans, saving, onSave, onArchive, onUnarchive, onDelete, onConnectQB, qbBusy }) {
  const isNew = !club;
  const [form, setForm] = useState(club ? { ...BLANK, ...club } : BLANK);
  const [showArchive, setShowArchive] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    setForm(club ? { ...BLANK, ...club } : BLANK);
  }, [club?.id]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const validColors = isValidHex(form.primary_color) && isValidHex(form.secondary_color);
  const slugOk = form.slug && !clubs.some((c) => c.slug === form.slug && c.id !== club?.id);
  const canSave = form.name && slugOk && validColors;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{isNew ? "Create Tenant" : `Edit ${club.name}`}</h3>
        {!isNew && club.slug && (
          <a href={getSubdomainUrl(club.slug)} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />Visit site
          </a>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Club name *</Label>
          <Input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              const auto = isNew && (!form.slug || form.slug === form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
              set(auto ? { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") } : { name });
            }}
          />
        </div>
        <SubdomainField value={form.slug} onChange={(slug) => set({ slug })} clubs={clubs} excludeId={club?.id} />

        <div className="space-y-1.5">
          <Label>Billing email</Label>
          <Input type="email" value={form.billing_email || ""} onChange={(e) => set({ billing_email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input value={form.address || ""} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Director name</Label>
          <Input value={form.director_name || ""} onChange={(e) => set({ director_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Admin name</Label>
          <Input value={form.admin_name || ""} onChange={(e) => set({ admin_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Primary contact name</Label>
          <Input value={form.primary_contact_name || ""} onChange={(e) => set({ primary_contact_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Primary contact email</Label>
          <Input type="email" value={form.primary_contact_email || ""} onChange={(e) => set({ primary_contact_email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Primary contact phone</Label>
          <Input value={form.primary_contact_phone || ""} onChange={(e) => set({ primary_contact_phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Club type</Label>
          <Select value={form.club_type || "live"} onValueChange={(v) => set({ club_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="live">Live — full concierge migration</SelectItem>
              <SelectItem value="trial">Trial — self-serve</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Plan</Label>
          <Select value={form.plan_tier} onValueChange={(v) => set({ plan_tier: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.tier}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <BrandingEditor form={form} set={set} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Internal notes</Label>
          <Textarea rows={2} value={form.internal_notes || ""} onChange={(e) => set({ internal_notes: e.target.value })} placeholder="Private — only visible to the system owner" />
        </div>
      </div>

      {!isNew && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant={club.quickbooks_connected ? "secondary" : "outline"}
            size="sm"
            disabled={qbBusy}
            onClick={() => onConnectQB(club.id)}
            className={club.quickbooks_connected ? "text-emerald-700 border-emerald-200 gap-1.5" : "gap-1.5"}
          >
            {qbBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            {club.quickbooks_connected ? "QuickBooks Linked" : "Connect QuickBooks"}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex gap-2">
          {!isNew && club.status !== "archived" && (
            <>
              <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setShowArchive(true)}>Archive</Button>
              <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setShowDelete(true)}>Delete</Button>
            </>
          )}
          {!isNew && club.status === "archived" && (
            <>
              <Button variant="outline" onClick={() => onUnarchive(club)}>Unarchive</Button>
              <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setShowDelete(true)}>Delete Permanently</Button>
            </>
          )}
        </div>
        <Button disabled={!canSave || saving} onClick={() => onSave(form, isNew)} className="bg-emerald-600 hover:bg-emerald-700">
          {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}{isNew ? "Create Tenant" : "Save changes"}
        </Button>
      </div>

      <ArchiveConfirmDialog club={club} open={showArchive} onOpenChange={setShowArchive} onConfirm={() => { setShowArchive(false); onArchive(club); }} />
      <DeleteConfirmDialog club={club} open={showDelete} onOpenChange={setShowDelete} onConfirm={() => { setShowDelete(false); onDelete(club); }} />
    </div>
  );
}