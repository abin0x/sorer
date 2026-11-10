import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import RegistrationDetailDialog from "@/components/tryout/RegistrationDetailDialog";
import { SESSION_LABEL, money, statusMeta, REG_STATUS, PAYMENT_STATUS } from "@/lib/tryoutRegisterApi";

/** Admin view of every family registration for one tryout: who is in, what is
 *  paid, and the cases that need a human (aid requests, refunds due). */
export default function PlanRegistrationsTab({ plan, events = [], clubId, canManage }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["planRegistrations", plan?.id],
    queryFn: () => base44.entities.TryoutRegistration.filter({ tryout_plan_id: plan.id }, "-created_date", 1000),
    enabled: !!plan?.id,
  });

  const sessionById = useMemo(() => {
    const map = {};
    events.forEach((e) => { map[e.id] = e; });
    return map;
  }, [events]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["planRegistrations", plan?.id] });

  const stats = {
    total: registrations.filter((r) => r.status !== "cancelled").length,
    paid: registrations.filter((r) => r.payment_status === "paid").length,
    owing: registrations.filter((r) => ["unpaid", "pending", "failed", "partially_paid"].includes(r.payment_status)).length,
    aid: registrations.filter((r) => r.financial_aid_status === "requested").length,
    refunds: registrations.filter((r) => r.refund_status === "due").length,
    waitlist: registrations.filter((r) => r.status === "waitlist").length,
  };

  const rows = registrations.filter((r) => {
    if (filter === "owing" && !["unpaid", "pending", "failed", "partially_paid"].includes(r.payment_status)) return false;
    if (filter === "aid" && r.financial_aid_status !== "requested") return false;
    if (filter === "refunds" && r.refund_status !== "due") return false;
    if (filter === "waitlist" && r.status !== "waitlist") return false;
    if (filter === "cancelled" && r.status !== "cancelled") return false;
    if (filter === "active" && r.status === "cancelled") return false;
    if (search) {
      const q = search.toLowerCase();
      return `${r.player_name} ${r.guardian_name} ${r.guardian_email}`.toLowerCase().includes(q);
    }
    return true;
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Registered", value: stats.total },
          { label: "Paid", value: stats.paid },
          { label: "Payment due", value: stats.owing },
          { label: "Aid requests", value: stats.aid },
          { label: "Refunds due", value: stats.refunds },
          { label: "Waitlist", value: stats.waitlist },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search player, parent or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All registrations</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="owing">Payment due</SelectItem>
            <SelectItem value="aid">Financial aid requests</SelectItem>
            <SelectItem value="refunds">Refunds due</SelectItem>
            <SelectItem value="waitlist">Waitlist</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
          <Users className="w-6 h-6" />
          No registrations to show.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Waivers</TableHead>
                <TableHead className="text-right">Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const session = sessionById[r.tryout_event_id];
                const reg = statusMeta(REG_STATUS, r.status);
                const pay = statusMeta(PAYMENT_STATUS, r.payment_status);
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                    <TableCell>
                      <p className="font-medium text-sm">{r.player_name}</p>
                      <p className="text-xs text-muted-foreground">{r.guardian_name || r.guardian_email}{r.desired_age_group ? ` · ${r.desired_age_group}` : ""}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {session ? <>{SESSION_LABEL[session.type] || "Session"}<br />{session.date}{session.start_time ? ` ${session.start_time}` : ""}</> : "—"}
                    </TableCell>
                    <TableCell><Badge className={reg.className}>{reg.label}</Badge></TableCell>
                    <TableCell><Badge className={pay.className}>{pay.label}</Badge></TableCell>
                    <TableCell className="text-xs">{r.waiver_status === "signed" ? "Signed" : "Outstanding"}</TableCell>
                    <TableCell className="text-right text-sm">
                      {money(r.fee_amount)}
                      {r.amount_paid > 0 && <span className="block text-xs text-muted-foreground">{money(r.amount_paid)} paid</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {open && (
        <RegistrationDetailDialog
          registration={registrations.find((r) => r.id === open.id) || open}
          plan={plan}
          events={events}
          clubId={clubId}
          canManage={canManage}
          onClose={() => setOpen(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}