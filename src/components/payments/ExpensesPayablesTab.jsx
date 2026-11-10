import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Clock, DollarSign, Loader2, Plus, Receipt, Search, Users, X, AlertCircle } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import { payablesDue } from "@/lib/financeLedger";

const money = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const VIEWS = [
  { id: "approvals", label: "Needs approval", icon: Clock },
  { id: "payables", label: "Bills to pay", icon: Receipt },
  { id: "staff", label: "Staff pay", icon: Users },
  { id: "paid", label: "Paid history", icon: CheckCircle2 },
];
const CATEGORIES = ["Field Rental", "Referees", "League Fees", "Tournaments", "Uniforms", "Equipment", "Travel", "Insurance", "Coach Education", "Marketing", "Other"];

function Stat({ icon: Icon, label, value, sub, tone = "default", onClick, active }) {
  const toneCls = { danger: "text-status-danger-700", warning: "text-status-warning-700", success: "text-status-success-700", default: "text-foreground" }[tone];
  return (
    <button type="button" onClick={onClick} className={`text-left rounded-xl border p-4 transition-all hover:shadow-sm ${active ? "border-primary ring-1 ring-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Icon className="w-3.5 h-3.5" />{label}</div>
      <p className={`mt-1 text-2xl font-extrabold ${toneCls}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </button>
  );
}

function dueBadge(row, today) {
  if (row.payment_status === "paid") return <Badge variant="outline" className="text-[10px] bg-status-success-50 text-status-success-700 border-status-success/20">Paid</Badge>;
  if (row.status === "pending") return <Badge variant="outline" className="text-[10px] bg-status-warning-50 text-status-warning-700 border-status-warning/20">Awaiting approval</Badge>;
  if (row.status === "rejected") return <Badge variant="outline" className="text-[10px]">Rejected</Badge>;
  if (row.date && row.date.slice(0, 10) < today) return <Badge variant="outline" className="text-[10px] bg-status-danger-50 text-status-danger-700 border-status-danger/20">Overdue</Badge>;
  return <Badge variant="outline" className="text-[10px] bg-status-info-50 text-status-info-700 border-status-info/20">Due {row.date?.slice(5, 10) || "—"}</Badge>;
}

/** Club bills and staff pay: approve, pay and record — the destination for the bookkeeper's expense and staff-pay cards. */
export default function ExpensesPayablesTab({ initialView = "approvals" }) {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const qc = useQueryClient();
  const today = todayIso();
  const [view, setView] = useState(VIEWS.some((v) => v.id === initialView) ? initialView : "approvals");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ kind: "expense", description: "", amount: "", date: today, category: "Field Rental", program_id: "", staff_name: "", role: "", hours_worked: "" });

  const { data: expenses = [], isLoading: le } = useQuery({
    queryKey: ["club-expenses", clubId],
    queryFn: () => base44.entities.Expense.filter({ club_id: clubId }, "-date", 1000),
    enabled: !!clubId,
  });
  const { data: staffPays = [], isLoading: ls } = useQuery({
    queryKey: ["club-staff-pays", clubId],
    queryFn: () => base44.entities.StaffPay.filter({ club_id: clubId }, "-date", 1000),
    enabled: !!clubId,
  });
  const { data: programs = [] } = useQuery({
    queryKey: ["club-programs-lite", clubId],
    queryFn: () => base44.entities.Program.filter({ club_id: clubId }, "title", 500),
    enabled: !!clubId,
  });
  const programTitle = useMemo(() => Object.fromEntries(programs.map((p) => [p.id, (p.title || "").replace(/^\d{4}-\d{2} Season — /, "")])), [programs]);

  const due = useMemo(() => payablesDue({ expenses, staffPays }, today), [expenses, staffPays, today]);
  const pending = expenses.filter((e) => e.status === "pending");
  const bills = expenses.filter((e) => e.status !== "pending" && e.status !== "rejected" && e.payment_status !== "paid");
  const staffOpen = staffPays.filter((s) => s.payment_status !== "paid");
  const paidRows = [
    ...expenses.filter((e) => e.payment_status === "paid").map((e) => ({ ...e, kind: "expense" })),
    ...staffPays.filter((s) => s.payment_status === "paid").map((s) => ({ ...s, kind: "staff_pay" })),
  ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const rowsFor = {
    approvals: pending.map((e) => ({ ...e, kind: "expense" })),
    payables: bills.map((e) => ({ ...e, kind: "expense" })).sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))),
    staff: staffPays.map((s) => ({ ...s, kind: "staff_pay" })).sort((a, b) => (a.payment_status === "paid") - (b.payment_status === "paid") || String(a.date || "").localeCompare(String(b.date || ""))),
    paid: paidRows,
  };
  const q = search.trim().toLowerCase();
  const rows = rowsFor[view].filter((r) => !q || [r.description, r.category, r.staff_name, r.role, programTitle[r.program_id]].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  const selectable = view !== "paid";
  const selectedRows = rows.filter((r) => selected.includes(`${r.kind}:${r.id}`));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["club-expenses", clubId] });
    qc.invalidateQueries({ queryKey: ["club-staff-pays", clubId] });
    qc.invalidateQueries({ queryKey: ["dash-expenses"] });
    qc.invalidateQueries({ queryKey: ["bookkeeper-staff-pays"] });
  };

  const apply = async (targets, patchFor, done) => {
    if (!targets.length) return;
    setBusy(true);
    try {
      for (const r of targets) {
        const entity = r.kind === "staff_pay" ? base44.entities.StaffPay : base44.entities.Expense;
        await entity.update(r.id, patchFor(r));
      }
      toast.success(done(targets.length));
      setSelected([]);
      refresh();
    } catch (e) {
      toast.error(e?.message || "Could not save the change.");
    } finally {
      setBusy(false);
    }
  };

  const approve = (targets) => apply(targets, () => ({ status: "approved", approval_date: today, payment_status: "to_be_paid" }), (n) => `${n} expense${n === 1 ? "" : "s"} approved`);
  const reject = (targets) => apply(targets, () => ({ status: "rejected", approval_date: today }), (n) => `${n} expense${n === 1 ? "" : "s"} rejected`);
  const markPaid = (targets) => apply(targets, (r) => (r.kind === "staff_pay" ? { payment_status: "paid" } : { payment_status: "paid", status: r.status === "pending" ? "approved" : r.status }), (n) => `${n} payment${n === 1 ? "" : "s"} marked paid`);

  const save = async () => {
    const amount = Number(form.amount);
    if (!(amount > 0)) { toast.error("Enter an amount"); return; }
    setBusy(true);
    try {
      if (form.kind === "staff_pay") {
        if (!form.staff_name.trim()) { toast.error("Enter who is being paid"); setBusy(false); return; }
        await base44.entities.StaffPay.create({ club_id: clubId, staff_name: form.staff_name.trim(), role: form.role, amount, date: form.date, hours_worked: Number(form.hours_worked) || null, program_id: form.program_id || null, payment_status: "to_be_paid" });
      } else {
        if (!form.description.trim()) { toast.error("Describe the expense"); setBusy(false); return; }
        await base44.entities.Expense.create({ club_id: clubId, description: form.description.trim(), amount, date: form.date, category: form.category, program_id: form.program_id || null, status: "pending", payment_status: "to_be_paid" });
      }
      toast.success(form.kind === "staff_pay" ? "Staff pay added" : "Expense added for approval");
      setAddOpen(false);
      setForm((f) => ({ ...f, description: "", amount: "", staff_name: "", role: "", hours_worked: "" }));
      setView(form.kind === "staff_pay" ? "staff" : "approvals");
      refresh();
    } catch (e) {
      toast.error(e?.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  if (!clubId) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a club to see its expenses.</CardContent></Card>;
  const loading = le || ls;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Clock} label="Needs approval" value={pending.length} sub={money(pending.reduce((s, e) => s + Number(e.amount || 0), 0))} tone={pending.length ? "warning" : "default"} active={view === "approvals"} onClick={() => setView("approvals")} />
        <Stat icon={AlertCircle} label="Overdue to pay" value={due.overdue.length} sub={money(due.overdue.reduce((s, r) => s + Number(r.amount || 0), 0))} tone={due.overdue.length ? "danger" : "default"} active={view === "payables"} onClick={() => setView("payables")} />
        <Stat icon={Users} label="Staff pay pending" value={staffOpen.length} sub={money(staffOpen.reduce((s, r) => s + Number(r.amount || 0), 0))} tone={staffOpen.length ? "warning" : "default"} active={view === "staff"} onClick={() => setView("staff")} />
        <Stat icon={DollarSign} label="Paid this season" value={money(paidRows.reduce((s, r) => s + Number(r.amount || 0), 0))} sub={`${paidRows.length} payments`} tone="success" active={view === "paid"} onClick={() => setView("paid")} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {VIEWS.map((v) => (
            <Button key={v.id} size="sm" variant={view === v.id ? "default" : "outline"} onClick={() => { setView(v.id); setSelected([]); }}>
              <v.icon className="w-3.5 h-3.5 mr-1.5" />{v.label}
              <span className="ml-1.5 text-[10px] opacity-80">{rowsFor[v.id].length}</span>
            </Button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses or staff…" className="pl-8" />
        </div>
        <Button size="sm" onClick={() => { setForm((f) => ({ ...f, kind: view === "staff" ? "staff_pay" : "expense" })); setAddOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add {view === "staff" ? "staff pay" : "expense"}
        </Button>
      </div>

      {selectable && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5">
          <span className="text-sm font-semibold">{selectedRows.length} selected · {money(selectedRows.reduce((s, r) => s + Number(r.amount || 0), 0))}</span>
          <div className="ml-auto flex gap-2">
            {view === "approvals" && <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => reject(selectedRows)}><X className="w-3.5 h-3.5 mr-1" />Reject</Button>
              <Button size="sm" disabled={busy} onClick={() => approve(selectedRows)}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</Button>
            </>}
            {view !== "approvals" && <Button size="sm" disabled={busy} onClick={() => markPaid(selectedRows)}><DollarSign className="w-3.5 h-3.5 mr-1" />Mark paid</Button>}
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto text-status-success-700 mb-2" />
              <p className="font-semibold">Nothing here</p>
              <p className="text-sm text-muted-foreground">{view === "approvals" ? "No expenses are waiting for approval." : view === "payables" ? "Every approved bill is paid." : "No records match."}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => {
                const key = `${r.kind}:${r.id}`;
                const open = r.payment_status !== "paid";
                return (
                  <div key={key} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/40">
                    {selectable && open && <Checkbox checked={selected.includes(key)} onCheckedChange={() => setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]))} />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{r.kind === "staff_pay" ? `${r.staff_name}${r.role ? ` · ${r.role}` : ""}` : r.description || "Expense"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.kind === "staff_pay" ? `Staff pay${r.hours_worked ? ` · ${r.hours_worked} hrs` : ""}` : r.category || "Other"}
                        {r.program_id && programTitle[r.program_id] ? ` · ${programTitle[r.program_id]}` : ""}
                        {r.date ? ` · ${r.date.slice(0, 10)}` : ""}
                      </p>
                    </div>
                    {dueBadge(r, today)}
                    <span className="w-24 text-right text-sm font-bold">{money(r.amount)}</span>
                    {open && (
                      <div className="flex gap-1.5">
                        {r.status === "pending" ? (
                          <>
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => reject([r])} aria-label="Reject"><X className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => approve([r])}>Approve</Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => markPaid([r])}>Mark paid</Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{form.kind === "staff_pay" ? "Add staff pay" : "Add an expense"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={form.kind === "expense" ? "default" : "outline"} onClick={() => setForm({ ...form, kind: "expense" })}>Expense</Button>
              <Button type="button" size="sm" variant={form.kind === "staff_pay" ? "default" : "outline"} onClick={() => setForm({ ...form, kind: "staff_pay" })}>Staff pay</Button>
            </div>
            {form.kind === "staff_pay" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Paid to</Label><Input value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} placeholder="Coach or staff name" /></div>
                <div><Label>Role</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Head Coach" /></div>
                <div><Label>Hours</Label><Input type="number" value={form.hours_worked} onChange={(e) => setForm({ ...form, hours_worked: e.target.value })} /></div>
              </div>
            ) : (
              <>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Referee fees — fall league" /></div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount ($)</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Due date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div><Label>Team / program (optional)</Label>
              <Select value={form.program_id || "none"} onValueChange={(v) => setForm({ ...form, program_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Club-wide</SelectItem>
                  {programs.map((p) => <SelectItem key={p.id} value={p.id}>{programTitle[p.id] || p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={save}>{busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
