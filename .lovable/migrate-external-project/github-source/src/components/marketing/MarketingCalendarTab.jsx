import React, { useState } from "react";
import { addMonths, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Megaphone, Loader2, AlertCircle } from "lucide-react";
import { PLATFORMS, STATUS_STYLES, EVENT_TYPES } from "@/lib/marketing/constants";
import { useMarketingEvents } from "@/lib/marketing/events";
import PromoteThisButton from "./PromoteThisButton";
import CalendarMonth from "./CalendarMonth";

export default function MarketingCalendarTab({ clubId, onComposer, onCampaign }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));

  const { data: events = [] } = useMarketingEvents(clubId);
  const { data: campaigns = [] } = useQuery({
    queryKey: ["mkt-campaigns", clubId], enabled: !!clubId,
    queryFn: async () => (await base44.entities.Campaign.filter({ club_id: clubId }, { sort: "-created_date", limit: 50 })).items,
  });
  const query = { club_id: clubId, scheduled_for: { $gte: gridStart.toISOString(), $lte: gridEnd.toISOString() } };
  if (platform !== "all") query.platform = platform;
  if (status !== "all") query.status = status;
  if (campaign !== "all") query.campaign_id = campaign;
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["mkt-posts", clubId, month.toISOString(), platform, status, campaign], enabled: !!clubId,
    queryFn: async () => (await base44.entities.Post.filter(query, { sort: "scheduled_for", limit: 500 })).items,
  });
  const { data: unscheduled = [] } = useQuery({
    queryKey: ["mkt-posts", clubId, "unscheduled"], enabled: !!clubId,
    queryFn: async () => (await base44.entities.Post.filter({ club_id: clubId, status: "draft", scheduled_for: { $exists: false } }, { sort: "-created_date", limit: 20 })).items,
  });

  const movePost = async (p, day) => {
    const d = parseISO(p.scheduled_for);
    const next = new Date(day);
    next.setHours(d.getHours(), d.getMinutes(), 0, 0);
    await base44.entities.Post.update(p.id, { scheduled_for: next.toISOString() });
    qc.invalidateQueries({ queryKey: ["mkt-posts"] });
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = events.filter((e) => e.date >= today).slice(0, 8);
  const campaignKeys = new Set(campaigns.map((c) => `${c.source_type}:${c.source_id}`));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="font-bold w-36 text-center">{format(month, "MMMM yyyy")}</h2>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All platforms</SelectItem>{Object.entries(PLATFORMS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.keys(STATUS_STYLES).map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={campaign} onValueChange={setCampaign}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All campaigns</SelectItem>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button className="ml-auto" onClick={() => onComposer({ event: null, post: null })}><Plus className="w-4 h-4 mr-1" /> New post</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
        <CalendarMonth month={month} gridStart={gridStart} posts={posts} events={events} onPostClick={(p) => onComposer({ event: null, post: p })} onMovePost={movePost} />
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-sm">Upcoming events</h3>
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events yet. Events from Events, Tournaments, Tryouts and games show up here.</p>}
          {upcoming.map((e) => {
            const hasCampaign = campaignKeys.has(e.key);
            return (
              <div key={e.key} className={`flex items-center gap-2 p-2 rounded-lg border ${hasCampaign ? "" : "border-amber-300 bg-amber-50/50"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {format(parseISO(e.date), "MMM d")} · {EVENT_TYPES[e.marketing_type]}
                    {!hasCampaign && <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium"><AlertCircle className="w-3 h-3" />No campaign</span>}
                  </p>
                </div>
                {hasCampaign ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onComposer({ event: e, post: null })}>Post</Button>
                    <Button size="sm" variant="ghost" title="Promo campaign" onClick={() => onCampaign(e)}><Megaphone className="w-4 h-4" /></Button>
                  </>
                ) : (
                  <PromoteThisButton event={e} clubId={clubId} size="sm" />
                )}
              </div>
            );
          })}
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-sm">This month's posts</h3>
          {posts.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled this month.</p>}
          {posts.map((p) => (
            <button key={p.id} type="button" onClick={() => onComposer({ event: null, post: p })} className="w-full text-left flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50">
              <span className={`w-2 h-2 rounded-full ${PLATFORMS[p.platform]?.dot}`} />
              <span className="flex-1 min-w-0"><span className="block text-sm truncate">{p.title}</span><span className="block text-xs text-muted-foreground truncate">{format(parseISO(p.scheduled_for), "MMM d, h:mm a")} · {PLATFORMS[p.platform]?.label}</span></span>
              <Badge className={`text-[10px] ${STATUS_STYLES[p.status]}`}>{p.status.replace("_", " ")}</Badge>
            </button>
          ))}
          {unscheduled.length > 0 && <h3 className="font-semibold text-sm pt-2">Unscheduled drafts</h3>}
          {unscheduled.map((p) => (
            <button key={p.id} type="button" onClick={() => onComposer({ event: null, post: p })} className="w-full text-left p-2 rounded-lg border text-sm truncate hover:bg-muted/50">{p.title} · {PLATFORMS[p.platform]?.label}</button>
          ))}
        </CardContent></Card>
      </div>
    </div>
  );
}