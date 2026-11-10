import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Loader2, DollarSign, X } from "lucide-react";
import { Link } from '@/lib/router-compat';
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import { useTenant } from "@/lib/TenantContext";
import { isCollected, isLate, normalizePaymentStatus } from "@/lib/financeLedger";

const STATUS_COLORS = {
  paid_in_full: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-sky-50 text-sky-700 border-sky-200",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  pending_setup: "bg-amber-50 text-amber-700 border-amber-200",
  past_due: "bg-rose-50 text-rose-700 border-rose-200",
  payment_failed: "bg-rose-50 text-rose-700 border-rose-200",
  on_hold: "bg-slate-100 text-slate-600 border-slate-200",
  waived: "bg-slate-100 text-slate-600 border-slate-200",
  refunded: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  not_started: "bg-slate-100 text-slate-500 border-slate-200",
};

const ALL = "all";

export default function PaymentsLedgerTab({ seasonStart, seasonEnd }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [teamFilter, setTeamFilter] = useState(ALL);
  const [branchFilter, setBranchFilter] = useState(ALL);
  const [genderFilter, setGenderFilter] = useState(ALL);
  const [platformFilter, setPlatformFilter] = useState(ALL);
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;

  const { data: rawPayments = [], isLoading } = useQuery({
    queryKey: ["payments-ledger", clubId],
    queryFn: () => base44.entities.Payment.filter(clubId ? { club_id: clubId } : {}, "-payment_date", 3000),
  });
  const payments = useMemo(() => rawPayments.map((p) => ({ ...p, status: normalizePaymentStatus(p.status) })), [rawPayments]);

  const { data: teams = [] } = useQuery({
    queryKey: ["payments-ledger-teams", clubId],
    queryFn: () => base44.entities.Team.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["payments-ledger-locations", clubId],
    queryFn: () => base44.entities.Location.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  // Payments denormalize team_id/team_name & branch_id/branch_name, but not
  // gender/platform — look those up from the Team record.
  const teamMetaById = useMemo(() => {
    const map = {};
    teams.forEach((t) => { map[t.id] = { gender: t.gender, platform_name: t.platform_name }; });
    return map;
  }, [teams]);

  const platformOptions = useMemo(() => {
    const set = new Set(teams.map((t) => t.platform_name).filter(Boolean));
    return Array.from(set).sort();
  }, [teams]);

  const filtered = useMemo(() => payments.filter((p) => {
    const matchStatus = statusFilter === ALL || p.status === statusFilter;
    const matchTeam = teamFilter === ALL || p.team_id === teamFilter;
    const matchBranch = branchFilter === ALL || p.branch_id === branchFilter;
    const meta = p.team_id ? teamMetaById[p.team_id] : null;
    const matchGender = genderFilter === ALL || meta?.gender === genderFilter;
    const matchPlatform = platformFilter === ALL || meta?.platform_name === platformFilter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      p.player_name?.toLowerCase().includes(q) ||
      p.guardian_name?.toLowerCase().includes(q) ||
      p.family_email?.toLowerCase().includes(q) ||
      p.source_label?.toLowerCase().includes(q);
    const d = (p.payment_date || p.created_date || "").slice(0, 10);
    const matchSeason = (!seasonStart || !d || d >= seasonStart) && (!seasonEnd || !d || d <= seasonEnd);
    return matchStatus && matchTeam && matchBranch && matchGender && matchPlatform && matchSearch && matchSeason;
  }), [payments, search, statusFilter, teamFilter, branchFilter, genderFilter, platformFilter, teamMetaById, seasonStart, seasonEnd]);

  const totalCollected = useMemo(() =>
    payments.filter(isCollected)
      .reduce((sum, p) => sum + (p.amount || 0), 0)
  , [payments]);

  const hasActiveFilters = statusFilter !== ALL || teamFilter !== ALL || branchFilter !== ALL || genderFilter !== ALL || platformFilter !== ALL || !!search;
  const clearFilters = () => {
    setSearch(""); setStatusFilter(ALL); setTeamFilter(ALL); setBranchFilter(ALL); setGenderFilter(ALL); setPlatformFilter(ALL);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${totalCollected.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Payments</p>
          <p className="text-2xl font-bold">{payments.length}</p>
        </CardContent></Card>
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Needs Attention</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{payments.filter(isLate).length}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Search player or family…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Statuses</SelectItem>
            {Object.keys(STATUS_COLORS).map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[150px] rounded-xl"><SelectValue placeholder="Team" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Teams</SelectItem>
            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[150px] rounded-xl"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Branches</SelectItem>
            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Gender" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Genders</SelectItem>
            <SelectItem value="Boys">Boys</SelectItem>
            <SelectItem value="Girls">Girls</SelectItem>
            <SelectItem value="Boys and Girls">Boys and Girls</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px] rounded-xl"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Platforms</SelectItem>
            {platformOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="adisal-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">No payments match these filters.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 surface-tile rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><DollarSign className="w-4 h-4 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.player_id ? (
                    <Link to={`${createPageUrl("PlayerDetail")}?id=${p.player_id}`} className="text-sm font-medium hover:text-primary hover:underline">{p.player_name || "Unknown"}</Link>
                  ) : (
                    <span className="text-sm font-medium">{p.player_name || "—"}</span>
                  )}
                  <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[p.status] || ""}`}>{p.status?.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {p.source_label} · {p.team_name || "No team"}{p.branch_name ? ` · ${p.branch_name}` : ""} · {p.processor_name || "Manual"} · {p.payment_method}{p.payment_date ? ` · ${format(new Date(p.payment_date), "MMM d, yyyy")}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold shrink-0">${(p.amount || 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}