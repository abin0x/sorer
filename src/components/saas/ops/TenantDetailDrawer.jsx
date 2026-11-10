import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { ExternalLink, Pause, Play, XCircle, Download, Trash2, Pencil, Link2, Mail, CreditCard, Activity, ArrowLeftRight, Loader2 } from "lucide-react";
import { getSubdomainUrl } from "@/lib/tenantResolver";
import { useTenant } from "@/lib/TenantContext";
import { isSystemOwner } from "@/lib/rbac";

const STATUS_COLORS = {
  trialing: "bg-amber-100 text-amber-700", active: "bg-emerald-100 text-emerald-700",
  past_due: "bg-rose-100 text-rose-700", suspended: "bg-slate-200 text-slate-700",
  canceled: "bg-red-100 text-red-700", archived: "bg-slate-100 text-slate-400",
};

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function Metric({ label, value, max, tone }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="rounded-lg border border-slate-100 p-2.5">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-sm font-bold text-slate-800 tabular-nums">{value}{max ? <span className="text-xs text-slate-400">/{max}</span> : null}</span>
      </div>
      {max ? <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${tone}`} style={{ width: `${pct}%` }} /></div> : null}
    </div>
  );
}

function HealthChip({ ok, label, detail }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-400"}`} />
      <span className="text-slate-600">{label}</span>
      {detail && <span className="text-slate-400">· {detail}</span>}
    </div>
  );
}

export default function TenantDetailDrawer({ club, counts, latestMigration, plans, onEdit, onReload, onClose }) {
  const { toast } = useToast();
  const { selectTenant } = useTenant();
  const [busy, setBusy] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => { setDeleteTyped(""); setReason(""); }, [club?.id, showDelete]);

  if (!club) return null;
  const u = counts[club.id] || {};
  const owner = true; // drawer is only opened by authorized users; gating at action bar
  const plan = plans.find((p) => p.tier === club.plan_tier);

  const act = async (key, fn, successMsg) => {
    setBusy(key);
    try { await fn(); toast({ title: successMsg }); onReload(); }
    catch (e) { toast({ title: "Action failed", description: e?.response?.data?.error || e?.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const setStatus = (status, isActive) => act(status, () => base44.entities.Club.update(club.id, { status, is_active: isActive }), `${club.name} set to ${status}`);

  const exportCsv = () => {
    const rows = [
      ["Field", "Value"],
      ["name", club.name], ["slug", club.slug], ["club_type", club.club_type], ["plan_tier", club.plan_tier],
      ["status", club.status], ["subscription_status", club.subscription_status], ["billing_email", club.billing_email || ""],
      ["director_name", club.director_name || ""], ["admin_name", club.admin_name || ""],
      ["primary_contact_name", club.primary_contact_name || ""], ["primary_contact_email", club.primary_contact_email || ""],
      ["primary_contact_phone", club.primary_contact_phone || ""], ["address", club.address || ""],
      ["max_players", club.max_players], ["max_branches", club.max_branches], ["max_teams", club.max_teams],
      ["players", u.players || 0], ["teams", u.teams || 0], ["branches", u.branches || 0],
      ["coaches", u.coaches || 0], ["guardians", u.guardians || 0], ["users", u.users || 0],
      ["quickbooks_connected", club.quickbooks_connected], ["stripe_account_id", club.stripe_account_id || ""],
      ["resend_domain_name", club.resend_domain_name || ""], ["resend_domain_status", club.resend_domain_status || ""],
      ["created_date", club.created_date || ""], ["updated_date", club.updated_date || ""],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${club.slug || club.name}-tenant-export.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = async () => {
    setBusy("delete");
    try {
      const res = await base44.functions.invoke("delete-club", { clubId: club.id });
      if (res.data?.errors?.length) toast({ title: `${club.name} deleted with warnings`, description: `${res.data.errors.length} cleanup step(s) had issues.`, variant: "destructive" });
      else toast({ title: `${club.name} deleted`, description: "All users, roles, and data cleaned up." });
      setShowDelete(false); onReload();
    } catch (e) { toast({ title: "Delete failed", description: e?.response?.data?.error || e?.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const mig = latestMigration?.[club.id];
  const modules = club.enabled_modules || {};

  return (
    <Sheet open={!!club} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
              {club.logo_url ? <img src={club.logo_url} alt="" className="w-full h-full object-contain" /> : <span className="font-bold text-slate-500">{club.name?.[0]?.toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{club.name}</SheetTitle>
              <SheetDescription className="truncate">{getSubdomainUrl(club.slug)}</SheetDescription>
            </div>
            <Badge className={`${STATUS_COLORS[club.status]} shrink-0`}>{club.status}</Badge>
          </div>
        </SheetHeader>

        <div className="space-y-5 px-6 pb-10">
          {/* Lifecycle */}
          <Section title="Lifecycle">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-slate-400">Plan</p><p className="font-semibold text-slate-800 capitalize">{club.plan_tier}</p></div>
              <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-slate-400">Type</p><p className="font-semibold text-slate-800 capitalize">{club.club_type}</p></div>
              <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-slate-400">Subscription</p><p className="font-semibold text-slate-800 capitalize">{club.subscription_status || "—"}</p></div>
              <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-slate-400">Created</p><p className="font-semibold text-slate-800">{club.created_date ? new Date(club.created_date).toLocaleDateString() : "—"}</p></div>
            </div>
          </Section>

          {/* Usage vs limits */}
          <Section title="Usage vs Plan Limits">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Players" value={u.players || 0} max={club.max_players} tone={(u.players / club.max_players) >= 0.9 ? "bg-rose-500" : (u.players / club.max_players) >= 0.7 ? "bg-amber-500" : "bg-emerald-500"} />
              <Metric label="Teams" value={u.teams || 0} max={club.max_teams} tone={(u.teams / club.max_teams) >= 0.9 ? "bg-rose-500" : "bg-amber-500"} />
              <Metric label="Branches" value={u.branches || 0} max={club.max_branches} tone={(u.branches / club.max_branches) >= 0.9 ? "bg-rose-500" : "bg-emerald-500"} />
              <Metric label="Coaches" value={u.coaches || 0} />
              <Metric label="Guardians" value={u.guardians || 0} />
              <Metric label="Users" value={u.users || 0} />
            </div>
          </Section>

          {/* Modules */}
          <Section title="Enabled Modules">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(modules).map(([k, v]) => (
                <Badge key={k} variant={v ? "default" : "outline"} className="text-[10px] capitalize">{k.replace(/_/g, " ")}{v ? "" : " · off"}</Badge>
              ))}
            </div>
          </Section>

          {/* Migration status */}
          <Section title="Migration Status">
            {mig ? (
              <div className="rounded-lg border border-slate-100 p-3 flex items-center gap-3">
                <ArrowLeftRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 capitalize">{mig.status.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-400 truncate">{mig.competitor_source || "import"} · {mig.commit_progress?.phase || ""}</p>
                </div>
                <Badge className="text-[10px]">{mig.commit_progress?.state || ""}</Badge>
              </div>
            ) : <p className="text-xs text-slate-400">No migration on record.</p>}
          </Section>

          {/* Connection health */}
          <Section title="Connection Health">
            <div className="space-y-1.5 rounded-lg border border-slate-100 p-3">
              <HealthChip ok={!!club.stripe_account_id} label="Stripe Connect" detail={club.stripe_account_id ? "linked" : "not connected"} />
              <HealthChip ok={!!club.quickbooks_connected} label="QuickBooks" detail={club.quickbooks_connected ? "linked" : "not connected"} />
              <HealthChip ok={club.resend_domain_status === "verified"} label="Resend email domain" detail={club.resend_domain_name ? `${club.resend_domain_name} (${club.resend_domain_status || "pending"})` : "not configured"} />
            </div>
          </Section>

          {/* Last activity */}
          <Section title="Last Activity">
            <p className="text-xs text-slate-500">{club.updated_date ? new Date(club.updated_date).toLocaleString() : "No recent activity recorded."}</p>
          </Section>

          {/* Actions */}
          <Section title="Tenant Actions">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => selectTenant(club.slug)} disabled={!club.slug} className="gap-1.5"><ExternalLink className="w-3.5 h-3.5" />Open Director View</Button>
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5"><Pencil className="w-3.5 h-3.5" />Edit Details</Button>
              <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5"><Download className="w-3.5 h-3.5" />Export CSV</Button>
              {club.status !== "suspended" && club.status !== "archived" && (
                <Button variant="outline" size="sm" disabled={busy === "suspended"} onClick={() => setStatus("suspended", false)} className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50">{busy === "suspended" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}Suspend</Button>
              )}
              {club.status === "suspended" && (
                <Button variant="outline" size="sm" disabled={busy === "active"} onClick={() => setStatus("active", true)} className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50">{busy === "active" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}Reactivate</Button>
              )}
              {club.status !== "canceled" && club.status !== "archived" && (
                <Button variant="outline" size="sm" disabled={busy === "canceled"} onClick={() => setStatus("canceled", false)} className="gap-1.5 text-slate-600"><XCircle className="w-3.5 h-3.5" />Cancel</Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 col-span-2"><Trash2 className="w-3.5 h-3.5" />Request Deletion</Button>
            </div>
          </Section>
        </div>
      </SheetContent>

      <Dialog open={showDelete} onOpenChange={(v) => { setShowDelete(v); setDeleteTyped(""); setReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {club.name}?</DialogTitle>
            <DialogDescription>This soft-deletes the tenant and all linked records. Type the club name and give a reason. The tenant can be restored within 30 days before a separate purge.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Club name</Label>
            <Input value={deleteTyped} onChange={(e) => setDeleteTyped(e.target.value)} placeholder={club.name} />
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this tenant being deleted?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteTyped.trim() !== club.name.trim() || !reason.trim() || busy === "delete"} onClick={confirmDelete}>{busy === "delete" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}Delete Tenant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}