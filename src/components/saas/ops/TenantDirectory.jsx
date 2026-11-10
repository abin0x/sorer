import React, { useMemo, useState } from "react";
import { Search, Building2, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS = {
  trialing: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  past_due: "bg-rose-100 text-rose-700",
  suspended: "bg-slate-200 text-slate-700",
  canceled: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-400",
};

function UsageBar({ label, value, max }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tone = pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <span className="text-[10px] text-slate-400 w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 w-12 text-right shrink-0 tabular-nums">{value}/{max}</span>
    </div>
  );
}

// Tenant directory: a searchable, filterable, sortable worklist.
export default function TenantDirectory({ clubs, counts, loading, searchRef, onSelect, selectedId }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [type, setType] = useState("all");
  const [sortKey, setSortKey] = useState("created_desc");

  const plans = useMemo(() => [...new Set(clubs.map((c) => c.plan_tier).filter(Boolean))], [clubs]);

  const filtered = useMemo(() => {
    let list = clubs.filter((c) => status === "all" ? c.status !== "archived" : c.status === status);
    if (plan !== "all") list = list.filter((c) => c.plan_tier === plan);
    if (type !== "all") list = list.filter((c) => c.club_type === type);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((c) => c.name?.toLowerCase().includes(s) || c.slug?.toLowerCase().includes(s) || c.primary_contact_email?.toLowerCase().includes(s));
    }
    const dir = sortKey.endsWith("_desc") ? -1 : 1;
    const key = sortKey.replace(/_(asc|desc)$/, "");
    list.sort((a, b) => {
      let av, bv;
      if (key === "name") { av = (a.name || "").toLowerCase(); bv = (b.name || "").toLowerCase(); }
      else if (key === "players") { av = counts[a.id]?.players || 0; bv = counts[b.id]?.players || 0; }
      else { av = Date.parse(a.created_date) || 0; bv = Date.parse(b.created_date) || 0; }
      return dir * (av < bv ? -1 : av > bv ? 1 : 0);
    });
    return list;
  }, [clubs, counts, q, status, plan, type, sortKey]);

  const SortHead = ({ label, k }) => (
    <button onClick={() => setSortKey((prev) => (prev.startsWith(k) && prev.endsWith("_desc") ? `${k}_asc` : `${k}_desc`))} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600">
      {label}
      {sortKey.startsWith(k) && (sortKey.endsWith("_desc") ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1" ref={searchRef}>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, slug, or contact email…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All active</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {plans.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-28"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1.6fr_0.7fr_0.7fr_1.1fr_0.8fr] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
          <SortHead label="Tenant" k="name" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Plan</span>
          <SortHead label="Usage vs Limits" k="players" />
          <span className="text-[10px] font-bold text-slate-400 uppercase text-right">Created</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading tenants…</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">{q ? `No tenants match "${q}".` : "No tenants yet."}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {filtered.map((c) => {
              const u = counts[c.id] || {};
              const active = c.id === selectedId;
              return (
                <button key={c.id} onClick={() => onSelect(c.id)} className={`w-full text-left grid grid-cols-1 lg:grid-cols-[1.6fr_0.7fr_0.7fr_1.1fr_0.8fr] gap-2 px-4 py-3 items-center hover:bg-slate-50 transition-colors ${active ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {c.logo_url ? <img src={c.logo_url} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <span className="text-xs font-bold text-slate-500">{c.name?.[0]?.toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.slug || "no-slug"}{c.club_type === "trial" ? " · trial" : ""}</p>
                    </div>
                  </div>
                  <Badge className={`${STATUS_COLORS[c.status] || "bg-slate-100"} w-fit text-[10px]`}>{c.status}</Badge>
                  <span className="text-xs text-slate-500 capitalize hidden lg:block">{c.plan_tier}</span>
                  <div className="hidden lg:flex flex-col gap-1">
                    <UsageBar label="Plyr" value={u.players || 0} max={c.max_players} />
                    <UsageBar label="Team" value={u.teams || 0} max={c.max_teams} />
                  </div>
                  <span className="text-xs text-slate-400 text-right hidden lg:block">{c.created_date ? new Date(c.created_date).toLocaleDateString() : "—"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}