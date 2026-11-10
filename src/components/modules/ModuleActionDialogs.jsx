import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Gift, Ban, Clock, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function GrantComplimentaryDialog({ open, onOpenChange, clubId, moduleKey, moduleLabel, onDone }) {
  const qc = useQueryClient();
  const [expiry, setExpiry] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleGrant = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const existing = await base44.entities.TenantModule.filter(
        { club_id: clubId, module_key: moduleKey }, "-created_date", 1
      );
      const expiresAt = expiry ? new Date(expiry).toISOString() : null;

      if (existing?.[0]) {
        await base44.entities.TenantModule.update(existing[0].id, {
          status: "complimentary",
          complimentary_expires_at: expiresAt,
          complimentary_reason: reason || "Granted by system owner",
          complimentary_granted_by: me?.email || "system_owner",
          drift_flagged: false,
          drift_detail: null,
        });
      } else {
        await base44.entities.TenantModule.create({
          club_id: clubId,
          module_key: moduleKey,
          status: "complimentary",
          complimentary_expires_at: expiresAt,
          complimentary_reason: reason || "Granted by system owner",
          complimentary_granted_by: me?.email || "system_owner",
        });
      }

      await base44.entities.EntitlementEvent.create({
        club_id: clubId,
        module_key: moduleKey,
        action: "complimentary_granted",
        to_status: "complimentary",
        reason: reason || "Granted by system owner",
        actor: me?.email || "system_owner",
        metadata: { expires_at: expiresAt },
      });

      qc.invalidateQueries({ queryKey: ["tenantModules"] });
      qc.invalidateQueries({ queryKey: ["entitlementEvents"] });
      toast.success(`Complimentary access granted for ${moduleLabel || moduleKey}`);
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error("Failed to grant complimentary access");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" /> Grant Complimentary Access
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Module</Label>
            <p className="text-sm text-muted-foreground">{moduleLabel || moduleKey}</p>
          </div>
          <div>
            <Label htmlFor="expiry">Expiry Date (optional — blank = permanent)</Label>
            <Input id="expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Beta partner, goodwill credit, pilot program" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGrant} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
            Grant Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RevokeDialog({ open, onOpenChange, clubId, moduleKey, moduleLabel, onDone }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleRevoke = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const existing = await base44.entities.TenantModule.filter(
        { club_id: clubId, module_key: moduleKey }, "-created_date", 1
      );
      if (!existing?.[0]) {
        toast.error("No module entitlement found to revoke");
        return;
      }
      const oldStatus = existing[0].status;
      await base44.entities.TenantModule.update(existing[0].id, {
        status: "expired",
      });
      await base44.entities.EntitlementEvent.create({
        club_id: clubId,
        module_key: moduleKey,
        action: "revoked",
        from_status: oldStatus,
        to_status: "expired",
        reason: reason || "Revoked by system owner",
        actor: me?.email || "system_owner",
      });
      qc.invalidateQueries({ queryKey: ["tenantModules"] });
      qc.invalidateQueries({ queryKey: ["entitlementEvents"] });
      toast.success(`Access revoked for ${moduleLabel || moduleKey}`);
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error("Failed to revoke access");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5" /> Revoke Module Access
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Module</Label>
            <p className="text-sm text-muted-foreground">{moduleLabel || moduleKey}</p>
          </div>
          <div>
            <Label htmlFor="revoke-reason">Reason</Label>
            <Textarea id="revoke-reason" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Subscription canceled, policy violation" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleRevoke} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
            Revoke Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExtendGraceDialog({ open, onOpenChange, clubId, moduleKey, moduleLabel, currentGraceEnds, onDone }) {
  const qc = useQueryClient();
  const [newDate, setNewDate] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (currentGraceEnds) {
      setNewDate(new Date(currentGraceEnds).toISOString().split("T")[0]);
    }
  }, [currentGraceEnds]);

  const handleExtend = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const existing = await base44.entities.TenantModule.filter(
        { club_id: clubId, module_key: moduleKey }, "-created_date", 1
      );
      if (!existing?.[0]) return;
      const graceEndsAt = newDate ? new Date(newDate).toISOString() : null;
      await base44.entities.TenantModule.update(existing[0].id, {
        grace_ends_at: graceEndsAt,
      });
      await base44.entities.EntitlementEvent.create({
        club_id: clubId,
        module_key: moduleKey,
        action: "grace_extended",
        to_status: existing[0].status,
        reason: `Grace extended to ${newDate}`,
        actor: me?.email || "system_owner",
        metadata: { grace_ends_at: graceEndsAt },
      });
      qc.invalidateQueries({ queryKey: ["tenantModules"] });
      qc.invalidateQueries({ queryKey: ["entitlementEvents"] });
      toast.success(`Grace extended for ${moduleLabel || moduleKey}`);
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error("Failed to extend grace");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" /> Extend Grace Period
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Module</Label>
            <p className="text-sm text-muted-foreground">{moduleLabel || moduleKey}</p>
          </div>
          <div>
            <Label htmlFor="grace-date">New Grace End Date</Label>
            <Input id="grace-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExtend} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
            Extend Grace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ForceSyncButton({ clubId, onDone }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("module-reconcile", {});
      toast.success(`Synced ${res.data?.checked || 0} subscriptions — ${res.data?.drifts || 0} drift(s), ${res.data?.suspended || 0} suspended, ${res.data?.expired || 0} expired`);
      onDone?.();
    } catch (e) {
      toast.error("Failed to force sync");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
      {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
      Force Stripe Sync
    </Button>
  );
}