import React from "react";
import { Wallet, Landmark, List, Receipt, Link2, BookOpenCheck, AlertCircle, FileText, Scale } from "lucide-react";
import PaymentsLedgerTab from "@/components/payments/PaymentsLedgerTab";
import OverdueQueueTab from "@/components/payments/overdue/OverdueQueueTab";
import PaymentAdminTools from "@/components/payments/PaymentAdminTools";
import ExpensesPayablesTab from "@/components/payments/ExpensesPayablesTab";
import InvoicesTab from "@/components/payments/InvoicesTab";
import FinancialSummaryTab from "@/components/payments/FinancialSummaryTab";
import QboMappingTab from "@/components/payments/QboMappingTab";
import QboReconciliationTab from "@/components/payments/QboReconciliationTab";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useModuleAccess } from '@/lib/useModuleAccess';
import { useSearchParams } from "@/lib/router-compat";
import SeasonSelector from "@/components/seasons/SeasonSelector";
import { useSelectedSeason } from "@/lib/useSelectedSeason";

const TABS = [
  { id: "summary", label: "Financial summary", icon: Scale },
  { id: "ledger", label: "Payment ledger", icon: List },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "overdue", label: "Overdue", icon: AlertCircle },
  { id: "expenses", label: "Expenses & staff pay", icon: Receipt, bookkeeping: true },
  { id: "admin", label: "Offline & refunds", icon: Landmark },
  { id: "qbo-mapping", label: "QuickBooks mapping", icon: Link2, bookkeeping: true },
  { id: "qbo-reconciliation", label: "Reconciliation", icon: BookOpenCheck, bookkeeping: true },
];

export default function PaymentSettings() {
  // Every tab is linkable (?tab=overdue, ?tab=invoices…) so dashboard cards land on the right work.
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "ledger";
  const qc = useQueryClient();
  const { hasModule } = useModuleAccess();
  const bookkeeping = hasModule('payments');
  const { selected: selectedSeason, seasons: seasonList, setSelectedSeason } = useSelectedSeason();
  const visible = TABS.filter((t) => !t.bookkeeping || bookkeeping);
  const activeTab = visible.some((t) => t.id === tab) ? tab : "ledger";
  const setTab = (id) => setParams((p) => { p.set("tab", id); p.delete("view"); return p; }, { replace: true });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["payments-ledger"] });
    qc.invalidateQueries({ queryKey: ["overdue-cases"] });
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="glass-wellness rounded-3xl p-6 lg:p-8 soft-shadow-lg animate-fadeInUp">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payments & finance</h1>
            <p className="text-sm text-muted-foreground">Money in and out, family invoices, overdue collections, bills and staff pay. Manage processors and accounting sync on the Connections page.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        {activeTab === "ledger" ? <SeasonSelector seasons={seasonList} value={selectedSeason?.id} onChange={setSelectedSeason} /> : <span />}
        <div className="flex gap-2 flex-wrap">
          {visible.map((t) => (
            <Button key={t.id} size="sm" variant={activeTab === t.id ? "default" : "outline"} onClick={() => setTab(t.id)}>
              <t.icon className="w-3.5 h-3.5 mr-1.5" /> {t.label}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === 'summary' && <FinancialSummaryTab />}
      {activeTab === 'ledger' && <PaymentsLedgerTab seasonStart={selectedSeason?.start_date} seasonEnd={selectedSeason?.end_date} />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'overdue' && <OverdueQueueTab />}
      {activeTab === 'expenses' && <ExpensesPayablesTab key={params.get("view") || "approvals"} initialView={params.get("view") || "approvals"} />}
      {activeTab === 'admin' && <PaymentAdminTools onDone={refresh} />}
      {activeTab === 'qbo-mapping' && <QboMappingTab canManage />}
      {activeTab === 'qbo-reconciliation' && <QboReconciliationTab />}
    </div>
  );
}
