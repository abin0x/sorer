import React from "react";
import { Link, useSearchParams } from '@/lib/router-compat';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, MapPin, Users, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PublicFooter from "@/components/public/PublicFooter";

const TYPE_LABEL = { main_tryout: "Main Tryout", supplemental_tryout: "Supplemental Tryout", open_training: "Open Training" };

/** Public tryouts landing page: /Tryouts?club=<clubId> */
export default function Tryouts() {
  const [params] = useSearchParams();
  const clubId = params.get("club");
  const { data, isLoading } = useQuery({
    queryKey: ["public-tryouts", clubId],
    queryFn: async () => (await base44.functions.invoke("tryoutPublic", { action: "list", club_id: clubId })).data,
    enabled: !!clubId,
  });
  const sessions = data?.sessions || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <Trophy className="w-8 h-8 mb-3" />
          <h1 className="pub-display text-4xl">{data?.club_name ? `${data.club_name} Tryouts` : "Tryouts"}</h1>
          <p className="mt-2 opacity-90">Pick a session and register your player — waivers, payment and confirmation in one go.</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {!clubId && <p className="text-muted-foreground">This link is missing a club. Ask the club for the correct tryouts link.</p>}
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {clubId && !isLoading && sessions.length === 0 && <p className="text-center text-muted-foreground py-12">No upcoming tryout sessions right now. Check back soon.</p>}
        {sessions.map((s) => {
          const full = s.capacity && s.registered >= s.capacity;
          return (
            <div key={s.id} className="pub-card p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg">{s.title || TYPE_LABEL[s.type] || "Tryout"}</h2>
                  <Badge variant="outline">{TYPE_LABEL[s.type] || s.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{s.date}{s.start_time ? ` · ${s.start_time}${s.end_time ? `–${s.end_time}` : ""}` : ""}</span>
                  {s.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.location}</span>}
                  {s.age_group && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{s.age_group} {s.gender}</span>}
                </p>
                {s.capacity ? <p className="text-xs text-muted-foreground">{full ? "Full, waitlist open" : `${s.capacity - s.registered} spots left`}</p> : null}
              </div>
              <Button asChild><Link to={`/TryoutRegister?club=${clubId}&id=${s.id}`}>{full ? "Join waitlist" : "Register"}</Link></Button>
            </div>
          );
        })}
      </div>
      <PublicFooter />
    </div>
  );
}