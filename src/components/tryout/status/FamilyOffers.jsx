import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS = {
  sent: { label: "Awaiting your answer", variant: "default" },
  accepted: { label: "Accepted", variant: "secondary" },
  declined: { label: "Declined", variant: "outline" },
  expired: { label: "Expired", variant: "outline" },
};

/** Team offers for this family, with accept / decline right on the status page. */
export default function FamilyOffers({ clubId, email }) {
  const [offers, setOffers] = useState([]);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    if (!clubId || !email) return;
    try {
      const res = await base44.functions.invoke("tryout-offers", { action: "family", club_id: clubId, email });
      setOffers(res.data?.offers || []);
    } catch {
      setOffers([]);
    }
  }, [clubId, email]);

  useEffect(() => { load(); }, [load]);

  const respond = async (offer, decision) => {
    if (decision === "decline" && !window.confirm(`Decline ${offer.player_name}'s spot on ${offer.team_name}? The spot goes to the next player.`)) return;
    setBusy(offer.id + decision);
    try {
      const res = await base44.functions.invoke("tryout-offers", { action: "respond", offer_id: offer.id, email, decision });
      if (decision === "accept" && res.data?.invite_id) {
        toast.success("Spot accepted — finish registration next.");
        window.location.href = `/FinalRegistration?invite=${res.data.invite_id}`;
        return;
      }
      toast.success(decision === "accept" ? "Spot accepted" : "Offer declined");
      await load();
    } catch (e) {
      toast.error(e.message || "Couldn't save your answer. Please try again.");
    }
    setBusy("");
  };

  if (!offers.length) return null;

  return (
    <section className="space-y-3" aria-label="Team offers">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" /> Team offers
      </h2>
      {offers.map((o) => {
        const meta = STATUS[o.status] || { label: o.status, variant: "outline" };
        return (
          <Card key={o.id} className={o.status === "sent" ? "border-primary shadow-md" : ""}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold break-words">{o.player_name}</p>
                  <p className="text-sm text-muted-foreground break-words">{o.team_name} · {o.plan_title}</p>
                </div>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>
              {o.fee_amount > 0 && <p className="text-sm">Team fee: <strong>${o.fee_amount.toLocaleString()}</strong>{o.fee_note ? ` — ${o.fee_note}` : ""}</p>}
              {o.status === "sent" && o.expires_label && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="w-4 h-4" /> Answer by {o.expires_label}</p>
              )}
              {o.status === "sent" && (
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => respond(o, "accept")} disabled={!!busy}>
                    {busy === o.id + "accept" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Accept spot
                  </Button>
                  <Button variant="outline" onClick={() => respond(o, "decline")} disabled={!!busy}>Decline</Button>
                </div>
              )}
              {o.status === "accepted" && o.final_registration_id && (
                <Button asChild variant="secondary">
                  <a href={`/FinalRegistration?invite=${o.final_registration_id}`}>Finish registration <ArrowRight className="w-4 h-4 ml-2" /></a>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
