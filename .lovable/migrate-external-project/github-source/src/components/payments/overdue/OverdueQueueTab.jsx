import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, Clock, DollarSign, Loader2, RefreshCw, Search, User, X } from "lucide-react";
import useOverdueCases from "./useOverdueCases";
import OverdueCaseRow from "./OverdueCaseRow";
import ResolutionDialog from "./ResolutionDialog";
import { BUCKET_META, STATUS_META, money, formatStamp } from "./caseStyles";

const BUCKETS = ["0-30", "31-60", "61-90", "90+"];
const ALL = "all";
const PAGE = 50;

/** Collections worklist: every family account with a late or missed payment, and what has been done about it. */
export default function OverdueQueueTab() {
  const { cases, summary, isLoading, isFetching, error, refetch, runAction } = useOverdueCases();
  const [currentUser, setCurrentUser] = useState(null);
  const [bucketFilter, setBucketFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [ownerFilter, setOwnerFilter] = useState(ALL);
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const [selectedId, setSelectedId] = useState(null);
  const [remindingId, setRemindingId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (bucketFilter !== ALL && c.aging_bucket !== bucketFilter) return false;
      if (statusFilter !== ALL && c.status !== statusFilter) return false;
      if (ownerFilter === "mine" && c.assigned_to !== currentUser?.email) return false;
      if (ownerFilter === "unassigned" && c.assigned_to) return false;
      if (!q) return true;
      return [c.player_name, c.guardian_name, c.family_email, c.team_name, c.source_label]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [cases, bucketFilter, statusFilter, ownerFilter, search, currentUser]);

  // A case leaves the open queue once it is settled or closed.
  const selectedCase = useMemo(() => cases.find((c) => c.id === selectedId) || null, [cases, selectedId]);
  useEffect(() => {
    if (selectedId && !selectedCase) setSelectedId(null);
  }, [selectedId, selectedCase]);

  const remind = async (caseRecord) => {
    setRemindingId(caseRecord.id);
    try {
      await runAction("reminder", { case_id: caseRecord.id });
      toast.success(`Reminder sent to ${caseRecord.family_email}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Reminder could not be sent.");
    } finally {
      setRemindingId(null);
    }
  };

  if (!isLoading && error) {
    return (
      <Card className="adisal-card"><CardContent className="p-8 text-center space-y-2">
        <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
        <p className="text-sm font-medium">The overdue queue could not be loaded.</p>
        <p className="text-xs text-muted-foreground">{error?.response?.data?.error || error?.message}</p>
      </CardContent></Card>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const totalOutstanding = summary?.totalOutstanding || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{money(totalOutstanding)}</p>
          <p className="text-[10px] text-muted-foreground">{summary?.missedPayments || 0} missed payments</p>
        </CardContent></Card>
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Open cases</p>
          <p className="text-2xl font-bold">{summary?.openCases || 0}</p>
          <p className="text-[10px] text-muted-foreground">{summary?.unassigned || 0} unassigned</p>
        </CardContent></Card>
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Being worked</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary?.inProgress || 0}</p>
          <p className="text-[10px] text-muted-foreground">cases in progress</p>
        </CardContent></Card>
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Follow-ups due</p>
          <p className="text-2xl font-bold">{summary?.followUpsDue || 0}</p>
          <p className="text-[10px] text-muted-foreground">on or before today</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={bucketFilter === ALL ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => { setBucketFilter(ALL); setVisible(PAGE); }}
        >
          All ages
        </Button>
        {BUCKETS.map((b) => {
          const info = summary?.buckets?.[b];
          return (
            <Button
              key={b}
              size="sm"
              variant={bucketFilter === b ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => { setBucketFilter(bucketFilter === b ? ALL : b); setVisible(PAGE); }}
            >
              {BUCKET_META[b].label}
              <span className="ml-1.5 text-[10px] opacity-80">{info?.count || 0} · {money(info?.amount || 0)}</span>
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search player, family, or team…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisible(PAGE); }}
            className="pl-8 rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setVisible(PAGE); }}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(STATUS_META).map(([key, meta]) => <SelectItem key={key} value={key}>{meta.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={(v) => { setOwnerFilter(v); setVisible(PAGE); }}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Anyone</SelectItem>
            <SelectItem value="mine">Assigned to me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
        {(bucketFilter !== ALL || statusFilter !== ALL || ownerFilter !== ALL || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => { setBucketFilter(ALL); setStatusFilter(ALL); setOwnerFilter(ALL); setSearch(""); setVisible(PAGE); }}
          >
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
        <Button variant="outline" size="sm" className="rounded-xl" disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Cases are built from the ledger: any payment past due or failed opens one case per family account, and it closes itself once the missed payments are settled.
        {summary?.lastSyncedAt ? ` Last checked ${formatStamp(summary.lastSyncedAt)}.` : ""}
        {summary?.autoClosed ? ` ${summary.autoClosed} case${summary.autoClosed === 1 ? "" : "s"} closed automatically on this check.` : ""}
      </p>

      {filtered.length === 0 ? (
        <Card className="adisal-card"><CardContent className="p-8 text-center space-y-1.5">
          <Clock className="w-6 h-6 text-emerald-500 mx-auto" />
          <p className="text-sm font-medium">Nothing overdue here.</p>
          <p className="text-xs text-muted-foreground">
            {cases.length === 0 ? "Every family account is up to date." : "No case matches these filters."}
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, visible).map((c) => (
            <OverdueCaseRow
              key={c.id}
              caseRecord={c}
              onOpen={() => setSelectedId(c.id)}
              onRemind={remind}
              reminding={remindingId === c.id}
            />
          ))}
          {filtered.length > visible && (
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setVisible(visible + PAGE)}>
              Show {Math.min(PAGE, filtered.length - visible)} more of {filtered.length}
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
          <User className="w-3 h-3 mr-1" /> Follow-ups keep a case visible until it is closed
        </Badge>
        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
          <DollarSign className="w-3 h-3 mr-1" /> Recording a payment updates the family&apos;s balance
        </Badge>
      </div>

      <ResolutionDialog
        caseRecord={selectedCase}
        currentUser={currentUser}
        onOpenChange={(next) => { if (!next) setSelectedId(null); }}
        onAction={runAction}
      />
    </div>
  );
}