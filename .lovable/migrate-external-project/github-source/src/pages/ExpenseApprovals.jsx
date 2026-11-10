import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, DollarSign, Clock, CheckCircle2, Receipt as ReceiptIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTenant } from "@/lib/TenantContext";
import ExpenseStatusBadge from "@/components/expenses/ExpenseStatusBadge";
import ReportReviewDialog from "@/components/expenses/ReportReviewDialog";
import ExpenseTypesManager from "@/components/expenses/ExpenseTypesManager";
import ExpenseNotificationSettings from "@/components/expenses/ExpenseNotificationSettings";
import { APPROVAL_QUEUE_STATUSES, round2 } from "@/lib/expenseHelpers";

function StatTile({ icon: Icon, label, value, tone }) {
  const tones = {
    amber: "text-amber-600 bg-amber-50", emerald: "text-emerald-600 bg-emerald-50",
    teal: "text-teal-600 bg-teal-50", slate: "text-slate-600 bg-slate-50",
  };
  return (
    <Card className="border-border/60 rounded-xl">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-lg font-extrabold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExpenseApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const [user, setUser] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPaid, setSelectedPaid] = useState([]);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["expense-approval-queue", clubId],
    queryFn: () => base44.entities.ExpenseReport.filter({ club_id: clubId }, "-created_date"),
    enabled: !!clubId,
  });

  // Show all reports needing review — self-submitted ones are visible (for
  // transparency) but the review dialog prevents self-approval.
  const queue = useMemo(() => reports.filter((r) => APPROVAL_QUEUE_STATUSES.includes(r.status)), [reports]);
  const approved = useMemo(() => reports.filter((r) => r.status === "approved" || r.status === "exported_to_quickbooks"), [reports]);
  const paid = useMemo(() => reports.filter((r) => r.status === "paid"), [reports]);

  const stats = useMemo(() => {
    const queueTotal = queue.reduce((s, r) => s + round2(r.submitted_total), 0);
    const approvedTotal = approved.reduce((s, r) => s + round2(r.approved_total), 0);
    const paidTotal = paid.reduce((s, r) => s + round2(r.approved_total), 0);
    return { queueCount: queue.length, queueTotal, approvedCount: approved.length, approvedTotal, paidCount: paid.length, paidTotal };
  }, [queue, approved, paid]);

  const openReport = (r) => { setActiveReport(r); setDialogOpen(true); };
  const toggleSelected = (id) => setSelectedPaid((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const batchMarkPaid = async () => {
    for (const id of selectedPaid) {
      await base44.entities.ExpenseReport.update(id, { status: "paid", paid_date: new Date().toISOString() });
    }
    const count = selectedPaid.length;
    setSelectedPaid([]);
    queryClient.invalidateQueries({ queryKey: ["expense-approval-queue", clubId] });
    toast({ title: `Marked ${count} report(s) as paid` });
  };

  const ReportRow = ({ r, selectable }) => (
    <Card key={r.id} className="border-border/60 rounded-xl hover:border-primary/40 hover:shadow-sm transition-all">
      <CardContent className="p-4 flex items-center gap-3 flex-wrap">
        {selectable && <Checkbox checked={selectedPaid.includes(r.id)} onCheckedChange={() => toggleSelected(r.id)} />}
        <button onClick={() => openReport(r)} className="flex-1 text-left min-w-0 group">
          <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{r.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{r.submitter_name} · {r.report_date}</p>
        </button>
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">${round2(r.approved_total || r.submitted_total).toFixed(2)}</span>
          <ExpenseStatusBadge status={r.status} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto bg-white min-h-screen">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-primary" /> Expense Approvals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Review coach and staff expense reports, approve or return them, and track payment.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={Clock} label="In Queue" value={stats.queueCount} tone="amber" />
        <StatTile icon={DollarSign} label="Queue Total" value={`$${stats.queueTotal.toFixed(2)}`} tone="slate" />
        <StatTile icon={CheckCircle2} label="Ready to Pay" value={stats.approvedCount} tone="emerald" />
        <StatTile icon={ReceiptIcon} label="Reimbursed" value={`$${stats.paidTotal.toFixed(2)}`} tone="teal" />
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Queue ({queue.length})</TabsTrigger>
          <TabsTrigger value="approved">Ready to Pay ({approved.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({paid.length})</TabsTrigger>
          <TabsTrigger value="types">Expense Types</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-2 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
          ) : queue.length === 0 ? (
            <Card className="border-border/60 rounded-xl">
              <CardContent className="py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground mb-1">All caught up</p>
                <p className="text-sm text-muted-foreground">No reports waiting for review.</p>
              </CardContent>
            </Card>
          ) : (
            queue.map((r) => <ReportRow key={r.id} r={r} />)
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-2 mt-4">
          {approved.length > 0 && (
            <div className="flex justify-end">
              <Button size="sm" disabled={selectedPaid.length === 0} className="gap-1.5" onClick={batchMarkPaid}>
                <DollarSign className="w-3.5 h-3.5" /> Mark {selectedPaid.length || ""} as paid
              </Button>
            </div>
          )}
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Nothing approved and waiting on payment.</p>
          ) : (
            approved.map((r) => <ReportRow key={r.id} r={r} selectable />)
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-2 mt-4">
          {paid.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No paid reports yet.</p>
          ) : (
            paid.map((r) => <ReportRow key={r.id} r={r} />)
          )}
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          <ExpenseTypesManager user={user} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <ExpenseNotificationSettings user={user} />
        </TabsContent>
      </Tabs>

      <ReportReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={activeReport}
        reviewer={user}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["expense-approval-queue", clubId] })}
      />
    </div>
  );
}