import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardHeader from "./shared/DashboardHeader";
import DashboardSection from "./shared/DashboardSection";
import QuickActionsBar from "./shared/QuickActionsBar";
import DrillDownLinks from "./shared/DrillDownLinks";
import PriorityActions from "./shared/PriorityActions";
import ActionTimeline from "./shared/ActionTimeline";
import useDashboardData from "./shared/useDashboardData";
import { BOOKKEEPER_WORKFLOW } from "./shared/roleWorkflows";
import OverdueResolutionWidget from "@/components/payments/overdue/OverdueResolutionWidget";
import { createPageUrl } from "@/utils";
import {
  Wallet, Receipt, FileBarChart, TrendingUp, DollarSign, AlertCircle,
  CheckCircle2, Clock, Download, Send, RefreshCw, FileText, Building2,
} from "lucide-react";

function KPITile({ icon: Icon, label, value, sublabel, tone = "emerald", to }) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-50", red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50", blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50", slate: "text-slate-600 bg-slate-50",
  };
  const content = (
    <Card className={`border-border-subtle rounded-xl ${to ? "hover:shadow-md transition-all cursor-pointer" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${toneMap[tone]}`}><Icon className="w-3.5 h-3.5" /></div>}
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</p>
        </div>
        <p className="text-xl font-extrabold text-text-primary">{value}</p>
        {sublabel && <p className="text-[10px] text-text-secondary mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function BookkeeperDashboard({ user }) {
  const { registrations, expenses, programs, locations, teams, payments } = useDashboardData();

  const today = new Date().toISOString().split("T")[0];
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  // Receivables
  const unpaidRegs = registrations.filter((r) => r.payment_status === "unpaid");
  const partialRegs = registrations.filter((r) => r.payment_status === "partial");
  const totalDue = registrations.reduce((s, r) => s + (r.amount_due || 0), 0);
  const totalPaid = registrations.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const outstandingTotal = totalDue - totalPaid;
  const overdueInvoices = [...unpaidRegs, ...partialRegs];

  // Aging buckets
  const agingBuckets = useMemo(() => {
    const buckets = { "0-30": 0, "31-60": 0, "60+": 0 };
    overdueInvoices.forEach((r) => {
      const created = new Date(r.created_date || today);
      const days = Math.floor((new Date(today) - created) / 86400000);
      if (days <= 30) buckets["0-30"] += (r.amount_due || 0) - (r.amount_paid || 0);
      else if (days <= 60) buckets["31-60"] += (r.amount_due || 0) - (r.amount_paid || 0);
      else buckets["60+"] += (r.amount_due || 0) - (r.amount_paid || 0);
    });
    return buckets;
  }, [overdueInvoices, today]);

  // Expenses
  const totalExpenseAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const unpaidExpenses = expenses.filter((e) => e.payment_status === "to_be_paid");
  const dueToday = unpaidExpenses.filter((e) => e.date === today);
  const dueThisWeek = unpaidExpenses.filter((e) => e.date > today && e.date <= weekAhead);
  const overdue = unpaidExpenses.filter((e) => e.date && e.date < today);
  const pendingApprovalExpenses = expenses.filter((e) => e.status === "pending");
  const byCategory = {};
  expenses.forEach((e) => {
    const key = e.category || "Other";
    byCategory[key] = (byCategory[key] || 0) + (e.amount || 0);
  });

  // Budget vs actual
  const budgetVariance = programs.map((p) => ({
    title: p.title,
    budget: p.budget || 0,
    actual: expenses.filter((e) => e.program_id === p.id).reduce((s, e) => s + (e.amount || 0), 0),
    revenue: registrations.filter((r) => r.program_id === p.id).reduce((s, r) => s + (r.amount_paid || 0), 0),
  })).filter((p) => p.budget > 0 || p.actual > 0).slice(0, 6);

  const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
  const netPosition = totalPaid - totalExpenseAmount;

  const timelineSteps = BOOKKEEPER_WORKFLOW.timelineSteps({ outstandingTotal, overdueInvoices, unpaidExpenses, pendingApprovalExpenses, collectionRate });
  const priorityActions = BOOKKEEPER_WORKFLOW.priorityActions({ outstandingTotal, overdueInvoices, pendingApprovalExpenses, overdue });

  const quickActions = [
    { label: "Generate Invoices", desc: "Bill approved registrations", icon: FileText, to: createPageUrl("PaymentSettings"), cardColor: "bg-blue-50 border-blue-200 text-blue-700", iconBg: "bg-blue-500", iconColor: "text-white" },
    { label: "Send Reminders", desc: "Payment overdue notices", icon: Send, to: createPageUrl("PaymentSettings"), cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
    { label: "Export Reports", desc: "Financial statements", icon: Download, to: createPageUrl("Analytics"), cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "Accounting Sync", desc: "QuickBooks sync", icon: RefreshCw, to: createPageUrl("Connections"), cardColor: "bg-purple-50 border-purple-200 text-purple-700", iconBg: "bg-purple-500", iconColor: "text-white" },
    { label: "Expense Approvals", desc: "Review coach & staff costs", icon: Receipt, to: createPageUrl("ExpenseApprovals"), cardColor: "bg-teal-50 border-teal-200 text-teal-700", iconBg: "bg-teal-500", iconColor: "text-white" },
  ];

  const drillDowns = [
    { label: "Invoice Detail", description: "Family account → payment history", to: createPageUrl("PaymentSettings") },
    { label: "Expense Detail", description: "Receipt → approval chain", to: createPageUrl("ExpenseApprovals") },
    { label: "Team Budget", description: "Transactions → variance", to: createPageUrl("Analytics") },
    { label: "Branch Financial Detail", description: "Revenue and expenses by branch", to: createPageUrl("Analytics") },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-surface-page min-h-screen">
      <DashboardHeader
        roleLabel="Bookkeeper Dashboard"
        userName={user?.full_name}
        subtitle="Transaction visibility, payment tracking, and expense management."
        primaryQuestion="What is the financial state of the club, and what needs reconciliation, collection, or approval?"
      />

      {/* Priority Actions — the hero widget */}
      <PriorityActions actions={priorityActions} />

      {/* Overdue payment resolutions — the collections worklist */}
      <OverdueResolutionWidget />

      {/* Workflow Timeline */}
      <ActionTimeline steps={timelineSteps} title="Financial Workflow" />

      {/* Quick Actions */}
      <QuickActionsBar actions={quickActions} />

      {/* At-a-Glance KPI Header */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPITile icon={DollarSign} label="Revenue (Season)" value={`$${totalPaid.toLocaleString()}`} sublabel="Collected" tone="emerald" to={createPageUrl("PaymentSettings")} />
        <KPITile icon={AlertCircle} label="Outstanding" value={`$${outstandingTotal.toLocaleString()}`} sublabel={`${overdueInvoices.length} invoices`} tone="red" to={createPageUrl("PaymentSettings")} />
        <KPITile icon={Receipt} label="Expenses (Season)" value={`$${totalExpenseAmount.toLocaleString()}`} sublabel={`${expenses.length} entries`} tone="amber" to={createPageUrl("ExpenseApprovals")} />
        <KPITile icon={Clock} label="Staff Pay Pending" value={dueToday.length + dueThisWeek.length + overdue.length} sublabel={`${overdue.length} overdue`} tone={overdue.length > 0 ? "red" : "slate"} to={createPageUrl("ExpenseApprovals")} />
        <KPITile icon={FileBarChart} label="Invoices Overdue" value={overdueInvoices.length} sublabel={`$${outstandingTotal.toLocaleString()}`} tone="red" to={createPageUrl("PaymentSettings")} />
        <KPITile icon={TrendingUp} label="Budget vs Actual" value={`$${netPosition.toLocaleString()}`} sublabel={`${collectionRate}% collected`} tone={netPosition >= 0 ? "emerald" : "red"} to={createPageUrl("Analytics")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue & Receivables */}
        <DashboardSection title="Revenue & Receivables" icon={Wallet} description="Registration revenue, payment plans, aging, refunds" viewAllLink={createPageUrl("PaymentSettings")}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-lg font-extrabold text-emerald-700">${totalPaid.toLocaleString()}</p>
                <p className="text-[10px] text-text-secondary">Collected</p>
              </div>
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-center">
                <p className="text-lg font-extrabold text-red-700">${outstandingTotal.toLocaleString()}</p>
                <p className="text-[10px] text-text-secondary">Outstanding</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <p className="text-lg font-extrabold text-blue-700">{collectionRate}%</p>
                <p className="text-[10px] text-text-secondary">Collection Rate</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-1.5">Receivables Aging</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50">
                  <span>0-30 days</span><span className="font-bold">${agingBuckets["0-30"].toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50">
                  <span>31-60 days</span><span className="font-bold text-amber-600">${agingBuckets["31-60"].toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50">
                  <span>60+ days</span><span className="font-bold text-red-600">${agingBuckets["60+"].toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">{unpaidRegs.length} unpaid</Badge>
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{partialRegs.length} partial</Badge>
            </div>
          </div>
        </DashboardSection>

        {/* Expenses & Payables */}
        <DashboardSection title="Expenses & Payables" icon={Receipt} description="Field costs, coach payments, vendors, tournaments" viewAllLink={createPageUrl("ExpenseApprovals")}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-center">
                <p className="text-lg font-extrabold text-red-700">{overdue.length}</p>
                <p className="text-[10px] text-text-secondary">Overdue</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <p className="text-lg font-extrabold text-amber-700">{dueToday.length}</p>
                <p className="text-[10px] text-text-secondary">Due Today</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <p className="text-lg font-extrabold text-blue-700">{dueThisWeek.length}</p>
                <p className="text-[10px] text-text-secondary">This Week</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-1.5">Expense Categories</p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {Object.entries(byCategory).slice(0, 6).map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50">
                    <span className="text-text-primary">{cat}</span>
                    <span className="font-bold">${amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashboardSection>

        {/* Approval Workflows */}
        <DashboardSection title="Approval Workflows" icon={CheckCircle2} description="Expenses, refunds, financial aid, budget adjustments" viewAllLink={createPageUrl("ExpenseApprovals")}>
          <div className="space-y-2">
            <Link to={createPageUrl("ExpenseApprovals")} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200 hover:shadow-sm transition-all">
              <span className="text-sm font-medium text-amber-700">Expense Approvals Pending</span>
              <span className="text-lg font-extrabold text-amber-700">{pendingApprovalExpenses.length}</span>
            </Link>
            <Link to={createPageUrl("PaymentSettings")} className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 border border-red-200 hover:shadow-sm transition-all">
              <span className="text-sm font-medium text-red-700">Refund / Credit Requests</span>
              <span className="text-lg font-extrabold text-red-700">{partialRegs.length}</span>
            </Link>
            <Link to={createPageUrl("Analytics")} className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 border border-blue-200 hover:shadow-sm transition-all">
              <span className="text-sm font-medium text-blue-700">Budget Adjustments</span>
              <span className="text-lg font-extrabold text-blue-700">{budgetVariance.length}</span>
            </Link>
          </div>
        </DashboardSection>

        {/* Reporting & Accounting Integration */}
        <DashboardSection title="Reporting & Accounting" icon={FileBarChart} description="Financial dashboards and QuickBooks sync" viewAllLink={createPageUrl("Analytics")}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-neutral-50 border border-border-subtle text-center">
                <p className="text-lg font-extrabold text-text-primary">${totalPaid.toLocaleString()}</p>
                <p className="text-[10px] text-text-secondary">Cash In</p>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-50 border border-border-subtle text-center">
                <p className="text-lg font-extrabold text-text-primary">${totalExpenseAmount.toLocaleString()}</p>
                <p className="text-[10px] text-text-secondary">Cash Out</p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-action/5 border border-action/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Net Position</span>
                <span className={`text-sm font-extrabold ${netPosition >= 0 ? "text-emerald-600" : "text-red-600"}`}>${netPosition.toLocaleString()}</span>
              </div>
              <Progress value={collectionRate} className="h-1.5 mt-2" />
              <p className="text-[10px] text-text-secondary mt-1">{collectionRate}% collection rate</p>
            </div>
            <Link to={createPageUrl("Connections")} className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50 border border-purple-200 hover:shadow-sm transition-all">
              <span className="text-sm font-medium text-purple-700">QuickBooks Sync</span>
              <RefreshCw className="w-4 h-4 text-purple-600" />
            </Link>
          </div>
        </DashboardSection>
      </div>

      {/* Drill-Down Views */}
      <DrillDownLinks items={drillDowns} />
    </div>
  );
}