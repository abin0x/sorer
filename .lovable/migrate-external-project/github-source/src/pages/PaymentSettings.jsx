import React, { useState } from "react";
import { Wallet, Landmark, List, Receipt, Link2, BookOpenCheck, AlertCircle } from "lucide-react";
import PaymentsLedgerTab from "@/components/payments/PaymentsLedgerTab";
import OverdueQueueTab from "@/components/payments/overdue/OverdueQueueTab";
import PaymentAdminTools from "@/components/payments/PaymentAdminTools";
import ExpenseReportsSummaryTab from "@/components/payments/ExpenseReportsSummaryTab";
import QboMappingTab from "@/components/payments/QboMappingTab";
import QboReconciliationTab from "@/components/payments/QboReconciliationTab";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useModuleAccess } from '@/lib/useModuleAccess';
import SeasonSelector from "@/components/seasons/SeasonSelector";
import { useSelectedSeason } from "@/lib/useSelectedSeason";

export default function PaymentSettings() {
  // The overdue queue is linkable, e.g. from the bookkeeper dashboard (?tab=overdue).
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get("tab") || "ledger");
  const qc = useQueryClient();
  const { hasModule } = useModuleAccess();
  const bookkeeping = hasModule('payments');
  const { selected: selectedSeason, seasons: seasonList, setSelectedSeason } = useSelectedSeason();
  const activeTab = !bookkeeping && ['expenses', 'qbo-mapping', 'qbo-reconciliation'].includes(tab) ? 'ledger' : tab;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["payments-ledger"] });
    qc.invalidateQueries({ queryKey: ["expense-approval-queue"] });
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="glass-wellness rounded-3xl p-6 lg:p-8 soft-shadow-lg animate-fadeInUp">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payments</h1>
            <p className="text-sm text-muted-foreground">Payment ledger, expense approvals, offline payments, and refunds. Manage processors and accounting sync on the Connections page.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SeasonSelector seasons={seasonList} value={selectedSeason?.id} onChange={setSelectedSeason} />
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={activeTab === "ledger" ? "default" : "outline"} onClick={() => setTab("ledger")}>
            <List className="w-3.5 h-3.5 mr-1.5" /> Payment Ledger
          </Button>
          <Button size="sm" variant={activeTab === "overdue" ? "default" : "outline"} onClick={() => setTab("overdue")}>
            <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Overdue
          </Button>
          {bookkeeping && <Button size="sm" variant={activeTab === "expenses" ? "default" : "outline"} onClick={() => setTab("expenses")}>
            <Receipt className="w-3.5 h-3.5 mr-1.5" /> Expense Reports
          </Button>}
          <Button size="sm" variant={activeTab === "admin" ? "default" : "outline"} onClick={() => setTab("admin")}>
            <Landmark className="w-3.5 h-3.5 mr-1.5" /> Admin Tools
          </Button>
          {bookkeeping && <>
            <Button size="sm" variant={activeTab === "qbo-mapping" ? "default" : "outline"} onClick={() => setTab("qbo-mapping")}><Link2 className="w-3.5 h-3.5 mr-1.5" /> QuickBooks Mapping</Button>
            <Button size="sm" variant={activeTab === "qbo-reconciliation" ? "default" : "outline"} onClick={() => setTab("qbo-reconciliation")}><BookOpenCheck className="w-3.5 h-3.5 mr-1.5" /> Reconciliation</Button>
          </>}
        </div>
      </div>

      {activeTab === 'ledger' && <PaymentsLedgerTab seasonStart={selectedSeason?.start_date} seasonEnd={selectedSeason?.end_date} />}
      {activeTab === 'overdue' && <OverdueQueueTab />}
      {bookkeeping && activeTab === 'expenses' && <ExpenseReportsSummaryTab />}
      {activeTab === 'admin' && <PaymentAdminTools onDone={refresh} />}
      {bookkeeping && activeTab === 'qbo-mapping' && <QboMappingTab canManage />}
      {bookkeeping && activeTab === 'qbo-reconciliation' && <QboReconciliationTab />}
    </div>
  );
}