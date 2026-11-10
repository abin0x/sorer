import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, Loader2, Search, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import RecordPaymentDialog from "@/components/payments/RecordPaymentDialog";
import { autoCompleteRoadmapTasks } from "@/lib/roadmapAutomation";
import SearchableSelect from "@/components/tryout/SearchableSelect";

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300", icon: XCircle },
  waitlisted: { label: "Waitlisted", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300", icon: Clock },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400", icon: XCircle },
};

const payConfig = {
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  refunded: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function RegistrationsList({ genderFilter = "all" }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [payingReg, setPayingReg] = useState(null);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["registrations", statusFilter],
    queryFn: () => base44.entities.Registration.list("-created_date", 100),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams-for-assign"],
    queryFn: () => base44.entities.Team.list("-created_date", 100),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["players-for-reg-filter"],
    queryFn: () => base44.entities.Player.list("-created_date", 200),
  });

  const filtered = registrations.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch = !search ||
      r.player_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.program_title?.toLowerCase().includes(search.toLowerCase());
    const matchGender = genderFilter === "all" || players.find((p) => p.id === r.player_id)?.gender === genderFilter;
    return matchStatus && matchSearch && matchGender;
  });

  const updateStatus = async (reg, newStatus) => {
    setUpdatingId(reg.id);
    try {
      await base44.entities.Registration.update(reg.id, { status: newStatus });

      // If approved, move player to active status
      if (newStatus === "approved" && reg.player_id) {
        await base44.entities.Player.update(reg.player_id, { status: "active" });
      }
      if (newStatus === "rejected" && reg.player_id) {
        await base44.entities.Player.update(reg.player_id, { status: "inactive" });
      }
      if (newStatus === "approved") {
        autoCompleteRoadmapTasks("registration");
      }

      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success(`Registration ${statusConfig[newStatus].label.toLowerCase()}`);
    } catch (err) {
      toast.error("Could not update registration.");
    } finally {
      setUpdatingId(null);
    }
  };

  const assignTeam = async (reg, teamId) => {
    if (!teamId) return;
    const team = teams.find((t) => t.id === teamId);
    setUpdatingId(reg.id);
    try {
      await base44.entities.Registration.update(reg.id, {
        team_id: teamId,
        team_name: team?.name || "",
        status: "approved",
      });
      await base44.entities.Player.update(reg.player_id, {
        team_id: teamId,
        team_name: team?.name || "",
        status: "active",
      });
      // Add player to team roster
      if (team) {
        const roster = team.player_ids || [];
        if (!roster.includes(reg.player_id)) {
          await base44.entities.Team.update(teamId, { player_ids: [...roster, reg.player_id] });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(`${reg.player_name} assigned to ${team?.name}`);
    } catch (err) {
      toast.error("Could not assign team.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePaymentSaved = async (payment) => {
    const reg = payingReg;
    if (!reg) return;
    let amountPaid = reg.amount_paid || 0;
    let paymentStatus = reg.payment_status;
    if (payment.status === "refunded") {
      amountPaid = Math.max(0, amountPaid - payment.amount);
      paymentStatus = "refunded";
    } else if (["paid_in_full", "active"].includes(payment.status)) {
      amountPaid += payment.amount;
      paymentStatus = amountPaid >= (reg.amount_due || 0) ? "paid" : "partial";
    }
    await base44.entities.Registration.update(reg.id, { amount_paid: amountPaid, payment_status: paymentStatus });
    queryClient.invalidateQueries({ queryKey: ["registrations"] });
    autoCompleteRoadmapTasks("payments");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrations ({filtered.length})</CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
            <Input placeholder="Search player or program..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="waitlisted">Waitlisted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">No registrations found.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((reg) => {
              const sc = statusConfig[reg.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <div key={reg.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {reg.player_id ? (
                          <Link to={`${createPageUrl("PlayerDetail")}?id=${reg.player_id}`} className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 hover:underline">
                            {reg.player_name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-900 dark:text-white">{reg.player_name}</span>
                        )}
                        <Badge className={`text-xs border ${sc.color}`}><StatusIcon className="w-3 h-3 mr-1" />{sc.label}</Badge>
                        <Badge className={`text-xs ${payConfig[reg.payment_status] || ""}`}>{reg.payment_status}</Badge>
                        {reg.financial_aid_requested && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300">Financial Aid</Badge>}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{reg.program_title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                        Guardian: {reg.guardian_name} · Submitted: {reg.registration_date ? format(new Date(reg.registration_date), "MMM d, yyyy") : "—"}
                        {reg.team_name && ` · Team: ${reg.team_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm" variant="outline" className="h-8 text-xs"
                        onClick={() => setPayingReg(reg)}
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" /> Record Payment
                      </Button>
                      {reg.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" className="h-8 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" disabled={updatingId === reg.id} onClick={() => updateStatus(reg, "approved")}>Approve</Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200" disabled={updatingId === reg.id} onClick={() => updateStatus(reg, "rejected")}>Reject</Button>
                        </>
                      )}
                      {reg.status === "approved" && !reg.team_id && (
                        <div className="w-[160px]">
                          <SearchableSelect onChange={(v) => assignTeam(reg, v)} options={teams.map((t) => ({ value: t.id, label: t.name }))} placeholder="Assign team..." />
                        </div>
                      )}
                      {reg.status === "approved" && reg.team_id && (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Rostered</Badge>
                      )}
                      {updatingId === reg.id && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <RecordPaymentDialog
        open={!!payingReg}
        onOpenChange={(v) => !v && setPayingReg(null)}
        source={payingReg ? {
          type: "registration", id: payingReg.id, label: `${payingReg.player_name} — ${payingReg.program_title || "Registration"}`,
          player_id: payingReg.player_id, player_name: payingReg.player_name, guardian_name: payingReg.guardian_name,
          defaultAmount: Math.max(0, (payingReg.amount_due || 0) - (payingReg.amount_paid || 0)) || undefined,
        } : null}
        onSaved={handlePaymentSaved}
      />
    </Card>
  );
}