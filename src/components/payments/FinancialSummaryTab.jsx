import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, TrendingDown, TrendingUp, Scale, CalendarClock } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import { financialSummary, isCollected, monthlyCashFlow } from "@/lib/financeLedger";

const money = (n) => `${n < 0 ? "-" : ""}$${Math.abs(Number(n || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

function downloadCsv(name, rows) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

/** Net position explained: money in, money out, what's coming, and how each team tracks against its budget. */
export default function FinancialSummaryTab() {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const opts = (key, fn) => ({ queryKey: [key, clubId], queryFn: fn, enabled: !!clubId });
  const { data: payments = [], isLoading: a } = useQuery(opts("fin-payments", () => base44.entities.Payment.filter({ club_id: clubId }, "-payment_date", 5000)));
  const { data: expenses = [], isLoading: b } = useQuery(opts("club-expenses", () => base44.entities.Expense.filter({ club_id: clubId }, "-date", 1000)));
  const { data: staffPays = [], isLoading: c } = useQuery(opts("club-staff-pays", () => base44.entities.StaffPay.filter({ club_id: clubId }, "-date", 1000)));
  const { data: programs = [] } = useQuery(opts("club-programs-lite", () => base44.entities.Program.filter({ club_id: clubId }, "title", 500)));
  const { data: registrations = [] } = useQuery(opts("invoice-registrations", () => base44.entities.Registration.filter({ club_id: clubId }, "player_name", 2000)));

  const summary = useMemo(() => financialSummary({ payments, expenses, staffPays }), [payments, expenses, staffPays]);
  const months = useMemo(() => monthlyCashFlow({ payments, expenses, staffPays }), [payments, expenses, staffPays]);
  const peak = Math.max(1, ...months.map((m) => Math.max(m.in, m.out)));

  const byCategory = useMemo(() => {
    const m = {};
    expenses.forEach((e) => { const k = e.category || "Other"; m[k] = (m[k] || 0) + Number(e.amount || 0); });
    const staff = staffPays.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (staff) m["Staff pay"] = (m["Staff pay"] || 0) + staff;
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  }, [expenses, staffPays]);
  const catTotal = byCategory.reduce((s, [, v]) => s + v, 0) || 1;

  const teams = useMemo(() => {
    const regByProgram = {};
    registrations.forEach((r) => { if (r.program_id) (regByProgram[r.program_id] ||= []).push(r); });
    return programs.map((p) => {
      const regs = regByProgram[p.id] || [];
      const spent = expenses.filter((e) => e.program_id === p.id).reduce((s, e) => s + Number(e.amount || 0), 0)
        + staffPays.filter((s) => s.program_id === p.id).reduce((s, x) => s + Number(x.amount || 0), 0);
      return {
        id: p.id,
        name: (p.title || "").replace(/^\d{4}-\d{2} Season — /, ""),
        budget: Number(p.budget || 0),
        spent,
        billed: regs.reduce((s, r) => s + Number(r.amount_due || 0), 0),
        collected: regs.reduce((s, r) => s + Number(r.amount_paid || 0), 0),
      };
    }).filter((t) => t.budget || t.spent || t.billed).sort((x, y) => y.budget - x.budget);
  }, [programs, registrations, expenses, staffPays]);

  const exportCsv = () => {
    const rows = [["Type", "Date", "Description", "Category / status", "Amount"]];
    payments.filter(isCollected).forEach((p) => rows.push(["Money in", p.payment_date, `${p.player_name || ""} — ${p.source_label || "Payment"}`, p.payment_method || "", p.amount]));
    expenses.forEach((e) => rows.push(["Expense", e.date, e.description, `${e.category || ""} / ${e.payment_status || ""}`, -Number(e.amount || 0)]));
    staffPays.forEach((s) => rows.push(["Staff pay", s.date, `${s.staff_name} (${s.role || ""})`, s.payment_status, -Number(s.amount || 0)]));
    rows.push([], ["Summary", "", "Money in", "", summary.cashIn], ["Summary", "", "Money out", "", -summary.cashOut], ["Summary", "", "Net position", "", summary.net]);
    downloadCsv(`financial-summary-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  if (!clubId) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a club to see its finances.</CardContent></Card>;
  if (a || b || c) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: TrendingUp, label: "Money in", value: money(summary.cashIn), sub: "Payments collected", tone: "text-status-success-700" },
          { icon: TrendingDown, label: "Money out", value: money(summary.cashOut), sub: `Bills ${money(summary.expensePaid)} · Staff ${money(summary.staffPaid)}${summary.refunds ? ` · Refunds ${money(summary.refunds)}` : ""}`, tone: "text-status-danger-700" },
          { icon: Scale, label: "Net position", value: money(summary.net), sub: "In minus out, to date", tone: summary.net >= 0 ? "text-status-success-700" : "text-status-danger-700" },
          { icon: CalendarClock, label: "Projected season net", value: money(summary.projectedNet), sub: `+${money(summary.scheduled + summary.late)} still to collect · −${money(summary.payables)} to pay`, tone: "text-foreground" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><s.icon className="w-3.5 h-3.5" />{s.label}</div>
            <p className={`mt-1 text-2xl font-extrabold ${s.tone}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card><CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Cash flow by month</p>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
          </div>
          {months.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No money has moved yet.</p> : (
            <div className="space-y-2.5">
              {months.map((m) => (
                <div key={m.month} className="grid grid-cols-[52px_1fr_88px] items-center gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground">{monthLabel(m.month)}</span>
                  <div className="space-y-1">
                    <div className="h-2.5 rounded-full bg-status-success" style={{ width: `${(m.in / peak) * 100}%`, minWidth: m.in ? 4 : 0 }} title={`In ${money(m.in)}`} />
                    <div className="h-2.5 rounded-full bg-status-danger" style={{ width: `${(m.out / peak) * 100}%`, minWidth: m.out ? 4 : 0 }} title={`Out ${money(m.out)}`} />
                  </div>
                  <span className={`text-right font-bold ${m.net >= 0 ? "text-status-success-700" : "text-status-danger-700"}`}>{money(m.net)}</span>
                </div>
              ))}
              <div className="flex gap-4 pt-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-success" />Money in</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-danger" />Money out</span>
              </div>
            </div>
          )}
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="mb-3 text-sm font-bold">Where the money goes</p>
          <div className="space-y-2">
            {byCategory.map(([cat, amt]) => (
              <div key={cat}>
                <div className="flex justify-between text-xs"><span>{cat}</span><span className="font-bold">{money(amt)}</span></div>
                <Progress value={(amt / catTotal) * 100} className="mt-1 h-1.5" />
              </div>
            ))}
            {!byCategory.length && <p className="py-6 text-center text-sm text-muted-foreground">No expenses recorded.</p>}
          </div>
        </CardContent></Card>
      </div>

      <Card className="overflow-hidden"><CardContent className="p-0">
        <p className="border-b border-border px-4 py-3 text-sm font-bold">Team budgets vs. actual</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-semibold">Team</th>
                <th className="px-4 py-2 text-right font-semibold">Budget</th>
                <th className="px-4 py-2 text-right font-semibold">Spent</th>
                <th className="px-4 py-2 text-left font-semibold w-40">Used</th>
                <th className="px-4 py-2 text-right font-semibold">Dues billed</th>
                <th className="px-4 py-2 text-right font-semibold">Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((t) => {
                const used = t.budget ? Math.round((t.spent / t.budget) * 100) : 0;
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-2.5 font-medium">{t.name}</td>
                    <td className="px-4 py-2.5 text-right">{money(t.budget)}</td>
                    <td className="px-4 py-2.5 text-right">{money(t.spent)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2"><Progress value={Math.min(100, used)} className="h-1.5 flex-1" /><span className={`text-xs font-bold ${used > 100 ? "text-status-danger-700" : "text-muted-foreground"}`}>{used}%</span></div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{money(t.billed)}</td>
                    <td className="px-4 py-2.5 text-right">{money(t.collected)}</td>
                  </tr>
                );
              })}
              {!teams.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No team budgets yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
