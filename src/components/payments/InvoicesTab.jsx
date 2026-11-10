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
import { toast } from "sonner";
import { FileText, Loader2, Mail, Printer, Search, Send, Wallet, CheckCircle2 } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import { invoiceCandidates, isCollected, isLate, isScheduled, nextInvoiceNumber, normalizePaymentStatus } from "@/lib/financeLedger";

const money = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const addDays = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function invoiceHtml({ club, row, charges, email }) {
  const r = row.registration;
  const lines = charges.map((c) => `<tr><td>${esc(c.invoice_number || "")}</td><td>${esc(c.source_label || "Charge")}</td><td>${esc((c.due_date || c.payment_date || "").slice(0, 10))}</td><td>${esc(normalizePaymentStatus(c.status).replace(/_/g, " "))}</td><td style="text-align:right">${money(c.amount)}</td></tr>`).join("");
  return `<!doctype html><html><head><title>Invoice — ${esc(r.player_name)}</title><style>
    body{font-family:system-ui,-apple-system,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 24px}
    h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
    th,td{padding:8px;border-bottom:1px solid #e5e7eb;text-align:left}.tot td{font-weight:700;border:0}
    .muted{color:#6b7280;font-size:13px}.row{display:flex;justify-content:space-between;gap:24px;margin-top:20px}
  </style></head><body>
  <div class="row"><div><h1>${esc(club?.name || "Club")}</h1><div class="muted">Statement of account</div></div>
  <div style="text-align:right"><div class="muted">Issued</div><div>${new Date().toISOString().slice(0, 10)}</div></div></div>
  <div class="row"><div><div class="muted">Bill to</div><div>${esc(r.guardian_name || "Family of " + (r.player_name || "player"))}</div><div class="muted">${esc(email || "")}</div></div>
  <div><div class="muted">Player</div><div>${esc(r.player_name || "")}</div><div class="muted">${esc(r.team_name || r.program_title || "")}</div></div></div>
  <table><thead><tr><th>Invoice</th><th>Description</th><th>Due</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead><tbody>${lines || '<tr><td colspan="5" class="muted">No open charges</td></tr>'}</tbody></table>
  <table><tbody>
    <tr class="tot"><td>Season dues</td><td style="text-align:right">${money(r.amount_due)}</td></tr>
    <tr class="tot"><td>Paid to date</td><td style="text-align:right">${money(r.amount_paid)}</td></tr>
    <tr class="tot"><td>Balance due</td><td style="text-align:right">${money(row.balance)}</td></tr>
  </tbody></table>
  <p class="muted" style="margin-top:24px">Pay online from your family account, or contact the club office to arrange a payment plan.</p>
  </body></html>`;
}

/** Bill family balances: create ledger invoices for unbilled dues, then print or email statements. */
export default function InvoicesTab() {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const club = tenant.club;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("unbilled");
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dueDate, setDueDate] = useState(addDays(14));
  const [busy, setBusy] = useState(false);
  const [emailing, setEmailing] = useState(null);

  const { data: registrations = [], isLoading: lr } = useQuery({
    queryKey: ["invoice-registrations", clubId],
    queryFn: () => base44.entities.Registration.filter({ club_id: clubId }, "player_name", 2000),
    enabled: !!clubId,
  });
  const { data: payments = [], isLoading: lp } = useQuery({
    queryKey: ["invoice-payments", clubId],
    queryFn: () => base44.entities.Payment.filter({ club_id: clubId }, "-payment_date", 5000),
    enabled: !!clubId,
  });
  const { data: guardians = [] } = useQuery({
    queryKey: ["invoice-guardians", clubId],
    queryFn: () => base44.entities.Guardian.filter({ club_id: clubId }, "last_name", 2000).catch(() => []),
    enabled: !!clubId,
  });

  const emailFor = useMemo(() => {
    const map = {};
    guardians.forEach((g) => (Array.isArray(g.player_ids) ? g.player_ids : []).forEach((pid) => { if (g.email && !map[pid]) map[pid] = g.email; }));
    payments.forEach((p) => { if (p.family_email && p.player_id && !map[p.player_id]) map[p.player_id] = p.family_email; });
    return map;
  }, [guardians, payments]);

  const chargesBySource = useMemo(() => {
    const m = {};
    payments.forEach((p) => { if (p.source_id) (m[p.source_id] ||= []).push(p); });
    return m;
  }, [payments]);

  const candidates = useMemo(() => invoiceCandidates(registrations, payments), [registrations, payments]);
  const q = search.trim().toLowerCase();
  const rows = candidates.filter((row) => {
    if (filter === "unbilled" && row.unbilled <= 0) return false;
    const r = row.registration;
    return !q || [r.player_name, r.guardian_name, r.team_name, r.program_title].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });
  const totals = {
    balance: candidates.reduce((s, r) => s + r.balance, 0),
    unbilled: candidates.reduce((s, r) => s + r.unbilled, 0),
    unbilledCount: candidates.filter((r) => r.unbilled > 0).length,
    scheduled: payments.filter(isScheduled).reduce((s, p) => s + Number(p.amount || 0), 0),
    late: payments.filter(isLate).reduce((s, p) => s + Number(p.amount || 0), 0),
  };
  const selectedRows = rows.filter((r) => selected.includes(r.registration.id) && r.unbilled > 0);

  const generate = async () => {
    setBusy(true);
    try {
      let numbers = payments.map((p) => p.invoice_number).filter(Boolean);
      for (const row of selectedRows) {
        const r = row.registration;
        const invoice_number = nextInvoiceNumber(numbers);
        numbers = [...numbers, invoice_number];
        await base44.entities.Payment.create({
          club_id: clubId,
          source_type: "registration",
          source_id: r.id,
          source_label: `Invoice ${invoice_number} — ${r.program_title || r.team_name || "season dues"} balance`,
          player_id: r.player_id || null,
          player_name: r.player_name || null,
          guardian_name: r.guardian_name || null,
          family_email: emailFor[r.player_id] || null,
          team_id: r.team_id || null,
          team_name: r.team_name || null,
          branch_id: r.location_id || null,
          branch_name: r.location_name || null,
          amount: row.unbilled,
          currency: "USD",
          processor_name: "Invoice",
          status: "scheduled",
          payment_date: dueDate,
          due_date: dueDate,
          invoice_number,
        });
      }
      toast.success(`${selectedRows.length} invoice${selectedRows.length === 1 ? "" : "s"} created`, { description: "They now appear in the payment ledger as scheduled charges." });
      setSelected([]);
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["invoice-payments", clubId] });
      qc.invalidateQueries({ queryKey: ["payments-ledger"] });
      qc.invalidateQueries({ queryKey: ["dash-payments"] });
    } catch (e) {
      toast.error(e?.message || "Invoices could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const openCharges = (row) => (chargesBySource[row.registration.id] || []).filter((c) => !isCollected(c) && !c.is_refund)
    .sort((a, b) => String(a.due_date || a.payment_date || "").localeCompare(String(b.due_date || b.payment_date || "")));

  const printStatement = (row) => {
    const w = window.open("", "_blank", "width=860,height=900");
    if (!w) { toast.error("Allow pop-ups to print statements."); return; }
    w.document.write(invoiceHtml({ club, row, charges: openCharges(row), email: emailFor[row.registration.player_id] }));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const emailStatement = async (row) => {
    const email = emailFor[row.registration.player_id];
    if (!email) { toast.error("No family email on file for this player."); return; }
    setEmailing(row.registration.id);
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        club_id: clubId,
        from_name: club?.name,
        subject: `${club?.name || "Club"} — statement for ${row.registration.player_name || "your player"} (${money(row.balance)} due)`,
        body: invoiceHtml({ club, row, charges: openCharges(row), email }),
      });
      toast.success(`Statement emailed to ${email}`);
    } catch (e) {
      toast.error(e?.message || "Email could not be sent.", { description: "Connect the club's Resend email on the Connections page to email statements." });
    } finally {
      setEmailing(null);
    }
  };

  if (!clubId) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a club to bill its families.</CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Family balances", value: money(totals.balance), sub: `${candidates.length} accounts`, icon: Wallet },
          { label: "Not yet billed", value: money(totals.unbilled), sub: `${totals.unbilledCount} accounts`, icon: FileText, tone: totals.unbilled > 0 ? "text-status-warning-700" : "" },
          { label: "Scheduled charges", value: money(totals.scheduled), sub: "Upcoming installments & invoices", icon: Send },
          { label: "Past due", value: money(totals.late), sub: "Worked in the Overdue tab", icon: Mail, tone: totals.late > 0 ? "text-status-danger-700" : "" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><s.icon className="w-3.5 h-3.5" />{s.label}</div>
            <p className={`mt-1 text-2xl font-extrabold ${s.tone || "text-foreground"}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filter === "unbilled" ? "default" : "outline"} onClick={() => setFilter("unbilled")}>Needs invoice</Button>
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All balances</Button>
        <div className="relative min-w-[200px] flex-1 sm:flex-none sm:ml-auto">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search player, family or team…" className="pl-8" />
        </div>
        <Button size="sm" disabled={!selectedRows.length} onClick={() => setConfirmOpen(true)}>
          <FileText className="w-3.5 h-3.5 mr-1.5" /> Generate {selectedRows.length || ""} invoice{selectedRows.length === 1 ? "" : "s"}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {lr || lp ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto text-status-success-700 mb-2" />
              <p className="font-semibold">{filter === "unbilled" ? "Every balance is already billed" : "No open balances"}</p>
              <p className="text-sm text-muted-foreground">{filter === "unbilled" ? "Switch to “All balances” to print or email statements." : "All family accounts are paid up."}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Checkbox
                  checked={rows.filter((r) => r.unbilled > 0).length > 0 && rows.filter((r) => r.unbilled > 0).every((r) => selected.includes(r.registration.id))}
                  onCheckedChange={(v) => setSelected(v ? rows.filter((r) => r.unbilled > 0).map((r) => r.registration.id) : [])}
                  aria-label="Select all"
                />
                <span className="flex-1">Player & family</span>
                <span className="hidden w-24 text-right sm:block">Balance</span>
                <span className="w-24 text-right">To bill</span>
                <span className="w-[76px]" />
              </div>
              <div className="divide-y divide-border">
                {rows.map((row) => {
                  const r = row.registration;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                      <Checkbox disabled={row.unbilled <= 0} checked={selected.includes(r.id)} onCheckedChange={() => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{r.player_name || "Player"}</p>
                        <p className="text-xs text-muted-foreground truncate">{[r.team_name || r.program_title, emailFor[r.player_id] || "No family email"].filter(Boolean).join(" · ")}</p>
                      </div>
                      <span className="hidden w-24 text-right text-sm sm:block">{money(row.balance)}</span>
                      <span className="w-24 text-right">
                        {row.unbilled > 0
                          ? <span className="text-sm font-bold text-status-warning-700">{money(row.unbilled)}</span>
                          : <Badge variant="outline" className="text-[10px] bg-status-success-50 text-status-success-700 border-status-success/20">Billed</Badge>}
                      </span>
                      <div className="flex w-[76px] justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => printStatement(row)} aria-label="Print statement"><Printer className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={emailing === r.id} onClick={() => emailStatement(row)} aria-label="Email statement">
                          {emailing === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Generate {selectedRows.length} invoice{selectedRows.length === 1 ? "" : "s"}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Each family is billed for the part of their balance that isn't already scheduled. Total: <strong className="text-foreground">{money(selectedRows.reduce((s, r) => s + r.unbilled, 0))}</strong>.</p>
            <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Unpaid invoices move into the Overdue queue automatically after the due date.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button disabled={busy || !selectedRows.length} onClick={generate}>{busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Create invoices</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
