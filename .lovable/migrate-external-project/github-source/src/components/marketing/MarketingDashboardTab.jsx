import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, differenceInDays } from "date-fns";
import { Megaphone, AlertTriangle, TrendingDown, Link2, MousePointerClick, UserPlus, CalendarClock, XCircle, CheckCircle2, Filter } from "lucide-react";
import { PLATFORMS, STATUS_STYLES, STATUS_LABELS } from "@/lib/marketing/constants";

const PLATFORM_LABEL = (p) => PLATFORMS[p]?.label || p;

export default function MarketingDashboardTab({ clubId, user, onComposer, onCampaign }) {
  const userBranch = user?.data?.branch_id || user?.data?.location_id || "";
  const isBranchScoped = user?.custom_role === "marketing_director" && !!userBranch;
  const [branch, setBranch] = useState(isBranchScoped ? userBranch : "all");

  const branchesQ = useQuery({
    queryKey: ["mkt-dashboard-branches", clubId],
    enabled: !!clubId && !isBranchScoped,
    queryFn: async () => (await base44.entities.Location.filter({ club_id: clubId }, { limit: 50, fields: ["name"] })).items,
  });

  const dashQ = useQuery({
    queryKey: ["mkt-dashboard", clubId, branch],
    enabled: !!clubId,
    queryFn: async () => (await base44.functions.invoke("marketing-dashboard", { club_id: clubId, branch_id: branch === "all" ? "" : branch })).data,
    refetchInterval: 60000,
  });

  const d = dashQ.data || {};
  const loading = dashQ.isLoading;

  return (
    <div className="space-y-4">
      {/* Branch selector */}
      {!isBranchScoped && (branchesQ.data?.length > 0) && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-48 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {(branchesQ.data || []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard icon={Megaphone} label="Upcoming posts" value={d.upcomingPosts?.length || 0} tone="violet" />
            <SummaryCard icon={TrendingDown} label="Under-filled" value={d.underfilled?.length || 0} tone="amber" />
            <SummaryCard icon={XCircle} label="Failed posts" value={d.failedPosts?.length || 0} tone="rose" />
            <SummaryCard icon={AlertTriangle} label="No campaign" value={d.eventsWithoutCampaign?.length || 0} tone="sky" />
          </div>

          {/* Account health */}
          <AccountHealthCard accounts={d.accountHealth || []} />

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Upcoming posts */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Megaphone className="w-4 h-4 text-violet-500" /> Upcoming posts</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {(d.upcomingPosts || []).length === 0 ? <Empty text="No posts scheduled" /> : (d.upcomingPosts || []).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
                    <span className={`w-2 h-2 rounded-full ${PLATFORMS[p.platform]?.dot || "bg-slate-400"}`} />
                    <span className="flex-1 truncate">{p.title || p.event_title}</span>
                    <Badge variant="outline" className="text-[10px]">{PLATFORM_LABEL(p.platform)}</Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{p.scheduled_for ? format(parseISO(p.scheduled_for), "MMM d, h:mm a") : ""}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Failed posts */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-500" /> Failed posts</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {(d.failedPosts || []).length === 0 ? <Empty text="No failed posts" /> : (d.failedPosts || []).map((p) => (
                  <div key={p.id} className="flex items-start gap-2 text-sm py-1.5 border-b last:border-0">
                    <span className={`w-2 h-2 rounded-full mt-1.5 ${PLATFORMS[p.platform]?.dot || "bg-slate-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{p.title || p.event_title}</p>
                      <p className="text-xs text-rose-500 truncate">{p.failure_reason || "Unknown error"}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Attempt {p.attempts || 1}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Events without campaigns */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Link2 className="w-4 h-4 text-sky-500" /> Events with no campaign</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {(d.eventsWithoutCampaign || []).length === 0 ? <Empty text="Every event has a campaign" /> : (d.eventsWithoutCampaign || []).map((e) => (
                  <div key={`${e.kind}:${e.id}`} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
                    <Badge variant="outline" className="text-[10px] capitalize">{e.kind}</Badge>
                    <span className="flex-1 truncate capitalize">{e.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{e.date ? format(parseISO(e.date), "MMM d") : ""}</span>
                    {onCampaign && <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => onCampaign({ source_type: e.kind === 'tryout' ? 'tryout' : 'club_event', source_id: e.id, title: e.name })}>Promote</Button>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Under-filled sessions */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4 text-amber-500" /> Under-filled sessions</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {(d.underfilled || []).length === 0 ? <Empty text="All sessions are full" /> : (d.underfilled || []).map((s) => (
                  <div key={`${s.kind}:${s.id}`} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
                    <Badge variant="outline" className="text-[10px] capitalize">{s.kind}</Badge>
                    <span className="flex-1 truncate capitalize">{s.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{s.registered}/{s.capacity}</span>
                    <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${s.fillPct < 30 ? "bg-rose-400" : "bg-amber-400"}`} style={{ width: `${s.fillPct}%` }} /></div>
                    <span className="text-xs font-medium w-8 text-right">{s.fillPct}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Per-post performance */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><MousePointerClick className="w-4 h-4 text-primary" /> Post performance — clicks & registrations by source</CardTitle></CardHeader>
            <CardContent className="pt-0">
              {(d.postPerformance || []).length === 0 ? <Empty text="No published posts yet" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2 font-medium">Post</th><th className="font-medium">Platform</th><th className="font-medium">Published</th>
                      <th className="font-medium text-center"><MousePointerClick className="w-3.5 h-3.5 inline" /> Clicks</th>
                      <th className="font-medium text-center"><UserPlus className="w-3.5 h-3.5 inline" /> Regs</th>
                      <th className="font-medium">UTM campaign</th>
                    </tr></thead>
                    <tbody>
                      {(d.postPerformance || []).map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-2 truncate max-w-48">{p.title}</td>
                          <td><Badge variant="outline" className="text-[10px]">{PLATFORM_LABEL(p.platform)}</Badge></td>
                          <td className="text-xs text-muted-foreground">{p.published_at ? format(parseISO(p.published_at), "MMM d") : ""}</td>
                          <td className="text-center font-semibold">{p.clicks}</td>
                          <td className="text-center font-semibold">{p.registrations}</td>
                          <td className="text-xs text-muted-foreground truncate max-w-32">{p.utm_campaign || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = { violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", sky: "bg-sky-50 text-sky-700" };
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone]}`}><Icon className="w-4 h-4" /></div>
        <div><p className="text-2xl font-bold leading-none">{value}</p><p className="text-xs text-muted-foreground mt-0.5">{label}</p></div>
      </div>
    </Card>
  );
}

function AccountHealthCard({ accounts }) {
  const active = accounts.filter((a) => a.status === "active" && (a.daysLeft === null || a.daysLeft >= 0));
  const expiring = accounts.filter((a) => a.daysLeft !== null && a.daysLeft >= 0 && a.daysLeft <= 7);
  const expired = accounts.filter((a) => a.status === "expired" || a.status === "revoked" || (a.daysLeft !== null && a.daysLeft < 0));
  if (accounts.length === 0) return (
    <Card><CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="w-4 h-4 text-amber-500" /> No social accounts connected. Add your Ayrshare API key in Settings.</CardContent></Card>
  );
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Account health</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-4 mb-3">
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm font-medium">{active.length}</span><span className="text-xs text-muted-foreground">active</span></div>
          {expiring.length > 0 && <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-sm font-medium">{expiring.length}</span><span className="text-xs text-muted-foreground">expiring soon</span></div>}
          {expired.length > 0 && <div className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-rose-500" /><span className="text-sm font-medium">{expired.length}</span><span className="text-xs text-muted-foreground">expired</span></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => {
            const isExpired = a.status === "expired" || a.status === "revoked" || (a.daysLeft !== null && a.daysLeft < 0);
            const isExpiring = a.daysLeft !== null && a.daysLeft >= 0 && a.daysLeft <= 7;
            return (
              <div key={a.platform} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${isExpired ? "border-rose-300 bg-rose-50/50" : isExpiring ? "border-amber-300 bg-amber-50/50" : "border-slate-200"}`}>
                <span className={`w-2 h-2 rounded-full ${PLATFORMS[a.platform]?.dot || "bg-slate-400"}`} />
                <span className="font-medium">{PLATFORM_LABEL(a.platform)}</span>
                {isExpired ? <span className="text-rose-600">Expired</span> : isExpiring ? <span className="text-amber-600">Expires in {a.daysLeft}d</span> : <span className="text-emerald-600">Active</span>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{text}</p>;
}