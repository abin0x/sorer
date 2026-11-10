import React, { useState } from "react";
import { Link2, Megaphone, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CampaignDialog from "@/components/marketing/CampaignDialog";

const TITLES = { main_tryout: "Club Tryout", open_training: "Open Training", supplemental_tryout: "Supplemental Tryout" };

/** Landing page links, QR codes and campaign creation for each tryout session. */
export default function PromotePanel({ plan, events, clubId }) {
  const [campaignEvent, setCampaignEvent] = useState(null);
  const origin = window.location.origin;
  const publicPage = `${origin}/TryoutRegister?club=${clubId}`;

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success("Link copied"); };
  const toMarketing = (e) => ({
    key: `tryout:${e.id}`, source_type: "tryout", source_id: e.id, title: `${plan.title} · ${TITLES[e.type] || "Tryout"}`,
    marketing_type: "tryout", date: e.date, time: e.start_time, location: e.location, description: e.notes,
    age_group: plan.age_group, url: `${origin}/TryoutRegister?club=${clubId}&id=${e.id}`,
  });

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm flex items-center gap-1.5"><Link2 className="w-4 h-4" /> Public tryout registration page</p>
          <p className="text-xs text-muted-foreground break-all">{publicPage}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => copy(publicPage)}><Copy className="w-3.5 h-3.5 mr-1" /> Copy</Button>
          <Button size="sm" variant="outline" asChild><a href={publicPage} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Open</a></Button>
        </div>
      </div>

      {events.length === 0 && <p className="text-sm text-muted-foreground">Create a session first. Each one gets its own landing page automatically.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {events.map((e) => {
          const link = `${origin}/TryoutRegister?club=${clubId}&id=${e.id}`;
          return (
            <div key={e.id} className="border border-border rounded-xl p-4 flex gap-4">
              <img alt="Registration QR" className="w-24 h-24 rounded-lg border" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`} />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{TITLES[e.type] || "Tryout"}</p>
                  <Badge variant="outline" className="text-[10px]">{e.registration_count || 0}{e.expected_attendance ? `/${e.expected_attendance}` : ""} registered</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{e.date}{e.start_time ? ` · ${e.start_time}` : ""}{e.location ? ` · ${e.location}` : ""}</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => copy(link)}><Copy className="w-3.5 h-3.5 mr-1" /> Link</Button>
                  <Button size="sm" onClick={() => setCampaignEvent(toMarketing(e))} disabled={!e.date}><Megaphone className="w-3.5 h-3.5 mr-1" /> Campaign</Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CampaignDialog open={!!campaignEvent} onOpenChange={(o) => !o && setCampaignEvent(null)} event={campaignEvent} clubId={clubId} />
    </div>
  );
}