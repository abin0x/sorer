import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, Clock, UserX, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { REQUIREMENTS, reqLabel, fmtDate } from "@/lib/compliance";

const STATUS_OPTS = [
  { value: "approved", label: "Approved" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "pending", label: "Pending Review" },
  { value: "flagged", label: "Flagged" },
  { value: "expired", label: "Expired" },
  { value: "missing", label: "Missing" },
];

function statusBadge(status) {
  const map = {
    approved: { cls: "bg-emerald-100 text-emerald-700", icon: ShieldCheck },
    expiring_soon: { cls: "bg-yellow-100 text-yellow-800", icon: Clock },
    pending: { cls: "bg-amber-100 text-amber-700", icon: Clock },
    flagged: { cls: "bg-orange-100 text-orange-700", icon: ShieldAlert },
    expired: { cls: "bg-red-100 text-red-700", icon: ShieldAlert },
    missing: { cls: "bg-slate-100 text-slate-600", icon: UserX },
  };
  return map[status] || map.missing;
}

export default function StaffComplianceCell({ staff, comp, canOverride }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  if (!staff.email) return <span className="text-xs text-slate-400">—</span>;

  const recs = comp?.byEmail?.[staff.email.toLowerCase()] || {};
  const bg = recs["background_check"];
  const ss = recs["safesport_certification"];
  const allOk = bg && ["approved", "expiring_soon"].includes(bg.status) && ss && ["approved", "expiring_soon"].includes(ss.status);
  const hasFlagged = bg?.status === "flagged" || ss?.status === "flagged";
  const hasExpired = bg?.status === "expired" || ss?.status === "expired";
  const hasMissing = !bg || bg.status === "missing" || !ss || ss.status === "missing";
  const hasPending = bg?.status === "pending" || ss?.status === "pending";

  const summary = allOk ? { cls: "bg-emerald-100 text-emerald-700", icon: ShieldCheck, label: "Compliant" }
    : hasFlagged ? { cls: "bg-orange-100 text-orange-700", icon: ShieldAlert, label: "Flagged" }
    : hasExpired ? { cls: "bg-red-100 text-red-700", icon: ShieldAlert, label: "Expired" }
    : hasPending ? { cls: "bg-amber-100 text-amber-700", icon: Clock, label: "Pending" }
    : hasMissing ? { cls: "bg-slate-100 text-slate-600", icon: UserX, label: "Missing" }
    : { cls: "bg-slate-100 text-slate-600", icon: UserX, label: "—" };

  const SIcon = summary.icon;

  // Collect issues for the reminder email
  const issues = REQUIREMENTS.map((r) => {
    const rec = recs[r.key];
    const st = rec?.status || "missing";
    if (st === "approved") return null;
    return { label: reqLabel(r.key), status: st, exp: rec?.expiration_date };
  }).filter(Boolean);

  const sendReminder = async () => {
    setSending(true);
    try {
      const items = issues.map((i) => `${i.label}: ${i.status}${i.exp ? ` (expires ${fmtDate(i.exp)})` : ""}`);
      const res = await base44.functions.invoke("compliance-reminder", {
        coach_email: staff.email,
        coach_name: staff.full_name,
        items,
        season_name: comp?.season?.name || "current season",
      });
      if (res?.data?.success) {
        toast.success(`Reminder sent to ${staff.email}`);
        setOpen(false);
      } else {
        toast.error(res?.data?.error || "Failed to send reminder");
      }
    } catch (e) {
      toast.error("Failed to send reminder");
    }
    setSending(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full hover:opacity-80 transition-opacity">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${summary.cls}`}>
          <SIcon className="w-3 h-3" />{summary.label}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compliance — {staff.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {comp?.season && <p className="text-sm text-slate-500">{comp.season.name} season</p>}
            {!comp?.season && <p className="text-sm text-amber-600">No active season — compliance records are season-scoped.</p>}
            {REQUIREMENTS.map((r) => {
              const rec = recs[r.key];
              const m = statusBadge(rec?.status || "missing");
              const MIcon = m.icon;
              return (
                <div key={r.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{reqLabel(r.key)}</p>
                    <p className="text-xs text-slate-500">
                      {rec?.completion_date ? `Completed ${fmtDate(rec.completion_date)}` : "No certificate on file"}
                      {rec?.expiration_date ? ` · Expires ${fmtDate(rec.expiration_date)}` : ""}
                    </p>
                  </div>
                  {canOverride ? (
                    <Select
                      value={rec?.status || "missing"}
                      onValueChange={async (val) => {
                        setSaving(true);
                        try {
                          if (rec?.id) {
                            await base44.entities.ComplianceRecord.update(rec.id, {
                              status: val,
                              reviewed_by: "manual_override",
                              reviewed_at: new Date().toISOString(),
                              admin_notes: "Manually overridden by admin",
                            });
                          }
                          toast.success(`${reqLabel(r.key)} set to ${val}`);
                          qc.invalidateQueries({ queryKey: ["coachCompliance"] });
                          qc.invalidateQueries({ queryKey: ["adminCompliance"] });
                        } catch (e) { toast.error("Failed to update"); }
                        setSaving(false);
                      }}
                      disabled={saving || !rec?.id}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`text-xs ${m.cls}`}><MIcon className="w-3 h-3 mr-1" />{rec?.status || "missing"}</Badge>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2">
            {canOverride && issues.length > 0 && (
              <Button variant="outline" onClick={sendReminder} disabled={sending} className="mr-auto">
                <Send className="w-3.5 h-3.5 mr-1.5" />{sending ? "Sending…" : "Send Reminder"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}