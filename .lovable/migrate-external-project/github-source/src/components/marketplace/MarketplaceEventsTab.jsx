import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function MarketplaceEventsTab({ clubId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState({});
  const [toggling, setToggling] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["marketplace-events", clubId],
    queryFn: () => base44.entities.ClubEvent.filter({ club_id: clubId }, "start_date", 200),
  });

  const { data: eventOffers = [] } = useQuery({
    queryKey: ["eventOffers", clubId],
    queryFn: () => base44.entities.Offer.filter({ club_id: clubId, type: "event" }, "sort_order", 200),
  });

  const getOfferForEvent = (evId) => eventOffers.find((o) => o.config?.club_event_id === evId);

  const toggleMarketplace = async (ev) => {
    setToggling(ev.id);
    try {
      const existing = getOfferForEvent(ev.id);
      if (existing) {
        // Toggle: archive or reactivate the existing offer
        await base44.entities.Offer.update(existing.id, { status: existing.status === "active" ? "archived" : "active" });
      } else {
        // Create a new event offer linked to this ClubEvent
        await base44.entities.Offer.create({
          club_id: clubId,
          name: ev.name,
          description: ev.description || "",
          image_url: ev.image_url || "",
          type: "event",
          access: ev.is_public ? "public" : "members_only",
          status: "active",
          sort_order: 0,
          config: {
            club_event_id: ev.id,
            price_options: [
              { key: "single", name: "Single Session", price: ev.price || 0, type: "individual" },
              ...(ev.schedule_type === "recurring" ? [{ key: "series", name: "Full Series", price: ev.series_price || 0, type: "series" }] : []),
              ...(ev.schedule_type === "multi_date" ? [{ key: "bulk", name: "All Days Pass", price: ev.bulk_price || 0, type: "full_range" }] : []),
            ],
            capacity_per_session: ev.capacity || 0,
            allow_waitlist: ev.allow_waitlist,
          },
        });
      }
      qc.invalidateQueries({ queryKey: ["eventOffers", clubId] });
      qc.invalidateQueries({ queryKey: ["marketplace-events", clubId] });
      toast.success(existing?.status === "active" ? "Removed from marketplace" : "Added to marketplace");
    } catch (e) { toast.error("Could not update event"); }
    setToggling(null);
  };

  const updatePrice = async (ev, field, value) => {
    const num = Number(value) || 0;
    setEditing((prev) => ({ ...prev, [`${ev.id}_${field}`]: num }));
  };

  const savePrice = async (ev, field) => {
    const value = editing[`${ev.id}_${field}`];
    if (value === undefined) return;
    try {
      await base44.entities.ClubEvent.update(ev.id, { [field]: value });
      qc.invalidateQueries({ queryKey: ["marketplace-events", clubId] });
      toast.success("Price updated");
    } catch { toast.error("Could not update price"); }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const publishedCount = eventOffers.filter((o) => o.status === "active").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {publishedCount} of {events.length} events published to the marketplace. Create and edit events in the Event Manager.
        </p>
        <Link to="/EventManager">
          <Button size="sm" variant="outline">
            Open Event Manager <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No events yet.</p>
          <p className="text-xs mt-1">Create events in the Event Manager first, then publish them here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const offer = getOfferForEvent(ev.id);
            const isPublished = offer?.status === "active";
            return (
              <Card key={ev.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <h3 className="font-semibold text-slate-900 truncate">{ev.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{ev.schedule_type || "single"}</Badge>
                        <Badge variant="outline" className="text-xs">${ev.price}</Badge>
                        <Badge variant={ev.status === "open" ? "default" : "secondary"} className="text-xs">{ev.status}</Badge>
                        {isPublished && <Badge className="text-xs bg-emerald-500 text-white">In Marketplace</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor={`mk-${ev.id}`} className="text-xs text-slate-500">Marketplace</Label>
                      <Switch id={`mk-${ev.id}`} checked={isPublished} disabled={toggling === ev.id} onCheckedChange={() => toggleMarketplace(ev)} />
                    </div>
                  </div>

                  {isPublished && (ev.schedule_type === "recurring" || ev.schedule_type === "multi_date") && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                      {ev.schedule_type === "recurring" && (
                        <div>
                          <Label className="text-xs">Series Pass Price ($)</Label>
                          <Input type="number" step="0.01" defaultValue={ev.series_price || 0} onChange={(e) => updatePrice(ev, "series_price", e.target.value)} onBlur={() => savePrice(ev, "series_price")} placeholder="0 = auto" className="mt-1" />
                        </div>
                      )}
                      {ev.schedule_type === "multi_date" && (
                        <div>
                          <Label className="text-xs">All-Days Pass Price ($)</Label>
                          <Input type="number" step="0.01" defaultValue={ev.bulk_price || 0} onChange={(e) => updatePrice(ev, "bulk_price", e.target.value)} onBlur={() => savePrice(ev, "bulk_price")} placeholder="0 = auto" className="mt-1" />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}