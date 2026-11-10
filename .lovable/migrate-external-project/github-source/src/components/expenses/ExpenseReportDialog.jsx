import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/lib/TenantContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ExpenseLineEditor from "./ExpenseLineEditor";
import { useScopedTeams } from "@/lib/useScopedTeams";
import { canEditReport, round2, DEFAULT_EXPENSE_TYPES, emptyLineWithDefaults, computeLineAllocations } from "@/lib/expenseHelpers";

export default function ExpenseReportDialog({ open, onOpenChange, report, user, onSaved }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id || user?.club_id;

  const [form, setForm] = useState({ title: "", purpose: "", location: "", report_date: new Date().toISOString().split("T")[0], default_team_ids: [] });
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [seedingTypes, setSeedingTypes] = useState(false);
  const linesEndRef = useRef(null);

  const { data: expenseTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["expense-types", clubId],
    queryFn: () => base44.entities.ExpenseType.filter({ club_id: clubId }, "name"),
    enabled: !!clubId,
  });

  const { teams: allTeams, isScoped: teamsScoped } = useScopedTeams(user, clubId);

  // Seed default expense types if none exist for this club.
  useEffect(() => {
    if (!open || !clubId || typesLoading || expenseTypes.length > 0 || seedingTypes) return;
    const today = new Date().toISOString().split("T")[0];
    setSeedingTypes(true);
    base44.entities.ExpenseType.bulkCreate(
      DEFAULT_EXPENSE_TYPES.map((t) => ({ ...t, club_id: clubId, rate_effective_date: today, is_active: true }))
    )
      .then(() => queryClient.invalidateQueries({ queryKey: ["expense-types", clubId] }))
      .catch(() => {})
      .finally(() => setSeedingTypes(false));
  }, [open, clubId, typesLoading, expenseTypes.length, seedingTypes, queryClient]);

  useEffect(() => {
    if (!open) return;
    if (report) {
      setForm({
        title: report.title || "",
        purpose: report.purpose || "",
        location: report.location || "",
        report_date: report.report_date || new Date().toISOString().split("T")[0],
        default_team_ids: report.default_team_ids || [],
      });
      base44.entities.ExpenseLine.filter({ report_id: report.id }).then((rows) => setLines(rows.length ? rows : [emptyLineWithDefaults(report.location)]));
    } else {
      setForm({ title: "", purpose: "", location: "", report_date: new Date().toISOString().split("T")[0], default_team_ids: [] });
      setLines([emptyLineWithDefaults("")]);
    }
  }, [open, report]);

  const readOnly = !canEditReport(report);
  const total = round2(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0));

  const addLine = () => {
    setLines((prev) => [...prev, emptyLineWithDefaults(form.location)]);
    setTimeout(() => linesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  };
  const updateLine = (idx, updated) => setLines((prev) => prev.map((l, i) => (i === idx ? updated : l)));
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const persist = async (nextStatus) => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    let tempId = null;
    try {
      const reportData = {
        club_id: clubId,
        submitter_id: user.id,
        submitter_name: user.full_name,
        title: form.title,
        purpose: form.purpose,
        location: form.location,
        report_date: form.report_date,
        default_team_ids: form.default_team_ids,
        submitted_total: total,
        status: nextStatus,
      };

      let reportId = report?.id;
      if (reportId) {
        const history = [...(report.status_history || [])];
        if (nextStatus !== report.status) history.push({ status: nextStatus, by_name: user.full_name, at: new Date().toISOString() });
        await base44.entities.ExpenseReport.update(reportId, { ...reportData, status_history: history });
      } else {
        // Show the new report in the list immediately, marked as syncing.
        tempId = `tmp-${Date.now()}`;
        queryClient.setQueryData(["my-expense-reports", user.id], (old = []) => [
          { id: tempId, __pending: true, ...reportData, created_date: new Date().toISOString() },
          ...(old || []),
        ]);
        const created = await base44.entities.ExpenseReport.create({
          ...reportData,
          status_history: [{ status: nextStatus, by_name: user.full_name, at: new Date().toISOString() }],
        });
        reportId = created.id;
        // Swap the temporary report for the record the server returned.
        queryClient.setQueryData(["my-expense-reports", user.id], (old = []) => (old || []).map((r) => (r.id === tempId ? created : r)));
      }

      for (const line of lines) {
        const { id, ...rest } = line;
        const allocations = computeLineAllocations(line.amount, form.default_team_ids, allTeams);
        const payload = { ...rest, allocations, club_id: clubId, report_id: reportId };
        if (id && !id.startsWith("tmp-")) {
          await base44.entities.ExpenseLine.update(id, payload);
        } else {
          await base44.entities.ExpenseLine.create(payload);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["my-expense-reports"] });
      queryClient.invalidateQueries({ queryKey: ["expense-approval-queue"] });
      toast({ title: nextStatus === "submitted" ? "Report submitted" : "Draft saved" });
      if (nextStatus === "submitted") {
        base44.functions.invoke("expense-notify", { event: "submitted", reportId }).catch(() => {});
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      // Drop the temporary report; the form keeps its input so nothing is lost.
      if (tempId) queryClient.setQueryData(["my-expense-reports", user.id], (old = []) => (old || []).filter((r) => r.id !== tempId));
      toast({ title: "Couldn't save, please try again.", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="p-5 pb-3 border-b border-border/60 shrink-0">
          <DialogTitle>{report ? (readOnly ? "View Expense Report" : "Edit Expense Report") : "New Expense Report"}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input disabled={readOnly} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. MLS Convention 2026" />
            </div>
            <div>
              <Label className="text-xs">Report date</Label>
              <Input type="date" disabled={readOnly} value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input disabled={readOnly} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Where expenses were incurred" />
            </div>
            <div>
              <Label className="text-xs">Default team(s){teamsScoped && <span className="text-muted-foreground/70 ml-1">· your teams only</span>}</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allTeams.length === 0 && teamsScoped && <p className="text-[11px] text-muted-foreground">No teams assigned to you yet.</p>}
                {allTeams.map((t) => {
                  const checked = form.default_team_ids.includes(t.id);
                  return (
                    <button key={t.id} type="button" disabled={readOnly}
                      onClick={() => setForm({ ...form, default_team_ids: checked ? form.default_team_ids.filter((id) => id !== t.id) : [...form.default_team_ids, t.id] })}
                      className={`text-[11px] px-2 py-1 rounded-full border ${checked ? "bg-primary/10 border-primary/40 text-primary" : "bg-background border-border text-muted-foreground"}`}>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Purpose</Label>
            <Textarea disabled={readOnly} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="min-h-[60px]" />
          </div>

          {report?.status === "returned" && report.return_reason && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
              <strong>Returned for changes:</strong> {report.return_reason}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Line items</Label>
              {!readOnly && (
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={addLine}>
                  <Plus className="w-3.5 h-3.5" /> Add line
                </Button>
              )}
            </div>
            {lines.map((line, idx) => (
              <ExpenseLineEditor
                key={line.id}
                line={line}
                expenseTypes={expenseTypes}
                onChange={(updated) => updateLine(idx, updated)}
                onRemove={() => removeLine(idx)}
                readOnly={readOnly}
              />
            ))}
            <div ref={linesEndRef} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-extrabold">${total.toFixed(2)}</span>
          </div>
        </div>

        {!readOnly && (
          <DialogFooter className="p-4 border-t border-border/60 shrink-0 gap-2">
            <Button variant="outline" disabled={saving} onClick={() => persist("draft")} className="gap-1.5">
              <Save className="w-4 h-4" /> Save draft
            </Button>
            <Button disabled={saving} onClick={() => persist("submitted")} className="gap-1.5">
              <Send className="w-4 h-4" /> Submit for approval
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}