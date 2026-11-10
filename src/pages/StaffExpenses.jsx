import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Receipt as ReceiptIcon, Clock, CheckCircle2, DollarSign, FileText, Loader2 } from "lucide-react";
import ExpenseStatusBadge from "@/components/expenses/ExpenseStatusBadge";
import ExpenseReportDialog from "@/components/expenses/ExpenseReportDialog";
import { round2 } from "@/lib/expenseHelpers";

function StatTile({ icon: Icon, label, value, tone }) {
  const tones = {
    slate: "text-slate-600 bg-slate-50", amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50", teal: "text-teal-600 bg-teal-50",
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

export default function StaffExpenses() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [filter, setFilter] = useState("all");

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["my-expense-reports", user?.id],
    queryFn: () => base44.entities.ExpenseReport.filter({ submitter_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const stats = useMemo(() => {
    const drafts = reports.filter((r) => r.status === "draft" || r.status === "returned");
    const pending = reports.filter((r) => r.status === "submitted" || r.status === "in_review");
    const approved = reports.filter((r) => r.status === "approved" || r.status === "exported_to_quickbooks");
    const paid = reports.filter((r) => r.status === "paid");
    const pendingTotal = pending.reduce((s, r) => s + round2(r.submitted_total), 0);
    const paidTotal = paid.reduce((s, r) => s + round2(r.approved_total), 0);
    return { drafts: drafts.length, pending: pending.length, approved: approved.length, paid: paid.length, pendingTotal, paidTotal };
  }, [reports]);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    if (filter === "pending") return reports.filter((r) => r.status === "submitted" || r.status === "in_review");
    if (filter === "drafts") return reports.filter((r) => r.status === "draft" || r.status === "returned");
    if (filter === "approved") return reports.filter((r) => r.status === "approved" || r.status === "exported_to_quickbooks");
    if (filter === "paid") return reports.filter((r) => r.status === "paid");
    return reports;
  }, [reports, filter]);

  const openNew = () => { setActiveReport(null); setDialogOpen(true); };
  const openExisting = (report) => { setActiveReport(report); setDialogOpen(true); };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto bg-white min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <ReceiptIcon className="w-6 h-6 text-primary" /> My Expenses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Submit coaching conventions, travel, mileage, and other reimbursable costs for approval.</p>
        </div>
        <Button className="gap-1.5" onClick={openNew}>
          <Plus className="w-4 h-4" /> New Report
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={FileText} label="Drafts" value={stats.drafts} tone="slate" />
        <StatTile icon={Clock} label="Pending Review" value={stats.pending} tone="amber" />
        <StatTile icon={CheckCircle2} label="Approved" value={stats.approved} tone="emerald" />
        <StatTile icon={DollarSign} label="Reimbursed" value={`$${stats.paidTotal.toFixed(2)}`} tone="teal" />
      </div>

      {/* Filter tabs */}
      {reports.length > 0 && (
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({reports.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({stats.drafts})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
            <TabsTrigger value="paid">Paid ({stats.paid})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60 rounded-xl">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ReceiptIcon className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">{filter === "all" ? "No expense reports yet" : "Nothing here"}</p>
            <p className="text-sm text-muted-foreground mb-4">{filter === "all" ? "Create your first report to get reimbursed for travel and costs." : "Try a different filter or create a new report."}</p>
            {filter === "all" && <Button className="gap-1.5" onClick={openNew}><Plus className="w-4 h-4" /> New Report</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const displayTotal = r.status === "approved" || r.status === "paid" || r.status === "exported_to_quickbooks" ? r.approved_total : r.submitted_total;
            return (
              <button key={r.id} onClick={() => !r.__pending && openExisting(r)} className="w-full text-left group">
                <Card className={`border-border/60 rounded-xl group-hover:border-primary/40 group-hover:shadow-md transition-all ${r.__pending ? "opacity-60" : ""}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.report_date} {r.location ? `· ${r.location}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm">${round2(displayTotal).toFixed(2)}</span>
                      {r.__pending ? (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing…
                        </span>
                      ) : (
                        <ExpenseStatusBadge status={r.status} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <ExpenseReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={activeReport}
        user={user}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["my-expense-reports", user?.id] })}
      />
    </div>
  );
}