import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, MapPin, Users, Clock, CheckCircle2, AlertCircle, Tent, GraduationCap, Stethoscope, Trophy, CircleDot, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { getHostname, getClubSlugFromHostname } from "@/lib/tenantResolver";
import PromoCodeInput from "@/components/payments/PromoCodeInput";
import PublicFooter from "@/components/public/PublicFooter";

const TYPE_LABEL = { camp: "Camp", class: "Class", clinic: "Clinic", tournament: "Tournament", open_play: "Open Play", social: "Social" };
const TYPE_ICON = { camp: Tent, class: GraduationCap, clinic: Stethoscope, tournament: Trophy, open_play: CircleDot, social: PartyPopper };

export default function EventSignup() {
  const [searchParams] = useSearchParams();
  const clubSlug = searchParams.get("club") || getClubSlugFromHostname(getHostname());
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ player_name: "", guardian_name: "", guardian_email: "", phone: "" });
  const [promo, setPromo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["public-events", clubSlug],
    queryFn: () => base44.functions.invoke("list-public-events", { club_slug: clubSlug }).then((r) => r.data),
    enabled: !!clubSlug,
  });

  const club = data?.club;
  const events = data?.events || [];

  const submit = async () => {
    if (!selected) return;
    if (!form.player_name || !form.guardian_email) { toast.error("Participant name and guardian email are required."); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("event-signup", {
        event_id: selected.id,
        player_name: form.player_name,
        guardian_name: form.guardian_name,
        guardian_email: form.guardian_email,
        phone: form.phone,
        promo_code: promo?.code,
      });
      const data = res.data;
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setDone({ status: data.status, event: selected });
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not complete signup.");
    }
    setSubmitting(false);
  };

  if (!clubSlug) {
    return <Wrapper><Card className="max-w-md mx-auto"><CardContent className="p-8 text-center text-sm text-muted-foreground">No club specified. Please use the link from your club's website.</CardContent></Card></Wrapper>;
  }

  if (isLoading) {
    return <Wrapper><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Wrapper>;
  }

  if (done) {
    return (
      <Wrapper club={club}>
        <Card className="max-w-md mx-auto border-emerald-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">{done.status === "waitlist" ? "Added to Waitlist" : "You're Registered!"}</h2>
            <p className="text-sm text-muted-foreground">{done.event.name}{done.status === "waitlist" ? " — we'll notify you if a spot opens up." : "."}</p>
            <Button className="mt-4" variant="outline" onClick={() => { setDone(null); setSelected(null); setForm({ player_name: "", guardian_name: "", guardian_email: "", phone: "" }); }}>Back to Events</Button>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  if (selected) {
    const isFull = selected.capacity > 0 && (selected.registered_count || 0) >= selected.capacity;
    const willWaitlist = isFull && selected.allow_waitlist;
    const price = selected.price || 0;
    const discounted = promo ? Math.max(0, price - promo.discount_amount) : price;
    return (
      <Wrapper club={club}>
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-3">← Back to events</Button>
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6 space-y-4">
            <div>
              <Badge className="mb-2">{TYPE_LABEL[selected.type] || selected.type}</Badge>
              <h1 className="text-xl font-bold">{selected.name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{selected.start_date}</span>
                {selected.start_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{selected.start_time}{selected.end_time ? `–${selected.end_time}` : ""}</span>}
                {selected.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selected.location}</span>}
              </div>
              {selected.description && <p className="text-sm text-muted-foreground mt-3">{selected.description}</p>}
            </div>
            {willWaitlist && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">This event is full. You'll be added to the waitlist and notified if a spot opens up.</p>
              </div>
            )}
            <div className="space-y-3 border-t pt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Participant Name *</Label><Input value={form.player_name} onChange={(e) => setForm({ ...form, player_name: e.target.value })} className="rounded-xl" /></div>
                <div className="space-y-1"><Label className="text-xs">Guardian Name</Label><Input value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} className="rounded-xl" /></div>
                <div className="space-y-1"><Label className="text-xs">Guardian Email *</Label><Input type="email" value={form.guardian_email} onChange={(e) => setForm({ ...form, guardian_email: e.target.value })} className="rounded-xl" /></div>
                <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" /></div>
              </div>
              {price > 0 && (
                <div className="space-y-2">
                  <PromoCodeInput clubId={selected.club_id || club?.id} sourceType="club_event" amount={price} onApplied={setPromo} />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{promo ? "Total after discount" : "Registration fee"}</span>
                    <span className="font-semibold">${discounted.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <Button onClick={submit} disabled={submitting} className="w-full h-11 bg-primary hover:bg-primary/90">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {willWaitlist ? "Join Waitlist" : price > 0 ? `Continue to Payment · $${discounted.toFixed(2)}` : "Register"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  return (
    <Wrapper club={club}>
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card className="max-w-md mx-auto"><CardContent className="p-8 text-center text-sm text-muted-foreground">No events are open for registration right now. Check back soon!</CardContent></Card>
        ) : events.map((ev) => {
          const full = ev.capacity > 0 && (ev.registered_count || 0) >= ev.capacity;
          const TypeIcon = TYPE_ICON[ev.type] || Calendar;
          return (
            <Card key={ev.id} className="max-w-2xl mx-auto overflow-hidden hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setSelected(ev)}>
              <CardContent className="p-5 flex gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <TypeIcon className="w-6 h-6 text-primary" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{ev.name}</p>
                      <p className="text-xs text-muted-foreground">{TYPE_LABEL[ev.type] || ev.type}</p>
                    </div>
                    {full ? <Badge className="bg-amber-100 text-amber-700">Full</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Open</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{ev.start_date}</span>
                    {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ev.registered_count || 0}{ev.capacity > 0 ? `/${ev.capacity}` : ""}</span>
                  </div>
                  <p className="text-sm font-medium mt-2">{ev.price > 0 ? `$${ev.price}` : "Free"}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Wrapper>
  );
}

function Wrapper({ club, children }) {
  return (
    <div className="safe-top min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {club && (
        <div className="bg-primary text-white" style={club.primary_color ? { background: club.primary_color } : undefined}>
          <div className="max-w-2xl mx-auto px-6 py-8">
            {club.logo_url && <img src={club.logo_url} alt={club.name} className="h-10 mb-3 object-contain" />}
            <h1 className="text-2xl font-bold">{club.name}</h1>
            <p className="text-white/80 text-sm mt-1">Event Registration</p>
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-8">{children}</div>
      <PublicFooter />
    </div>
  );
}