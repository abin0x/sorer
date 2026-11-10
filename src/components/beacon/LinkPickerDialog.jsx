import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, CalendarCheck, ShoppingBag, Link2 } from "lucide-react";

const PRESETS = [
  { key: "dues", label: "Club dues", desc: "Pay a dues offer", icon: CreditCard },
  { key: "events", label: "Event signup", desc: "Register and pay for events", icon: CalendarCheck },
  { key: "marketplace", label: "Marketplace", desc: "Spiritwear and club shop", icon: ShoppingBag },
  { key: "custom", label: "Custom link", desc: "Any payment or signup URL", icon: Link2 },
];

const DEFAULT_LABEL = {
  dues: "Pay club dues",
  events: "Register for an event",
  marketplace: "Visit the club shop",
  custom: "",
};

const rows = (r) => (Array.isArray(r) ? r : r?.items || []);

/** Attach a payment or registration link to a Beacon post. */
export default function LinkPickerDialog({ open, onOpenChange, clubId, onAttach }) {
  const [preset, setPreset] = useState("dues");
  const [offerId, setOfferId] = useState("");
  const [label, setLabel] = useState(DEFAULT_LABEL.dues);
  const [customUrl, setCustomUrl] = useState("");

  const { data: offers = [] } = useQuery({
    queryKey: ["beacon-dues-offers", clubId],
    queryFn: () => base44.entities.Offer.filter({ club_id: clubId, type: "dues" }, "-created_date", 100).then(rows),
    enabled: !!clubId && open,
  });
  const activeOffers = offers.filter((o) => o.status !== "archived");

  const { data: clubSlug } = useQuery({
    queryKey: ["beacon-club-slug", clubId],
    queryFn: () => base44.entities.Club.filter({ id: clubId }, "-created_date", 1).then((r) => rows(r)[0]?.slug || ""),
    enabled: !!clubId && open,
  });
  const slug = clubSlug || clubId;

  useEffect(() => {
    if (open) { setPreset("dues"); setOfferId(""); setLabel(DEFAULT_LABEL.dues); setCustomUrl(""); }
  }, [open]);

  const choosePreset = (key) => {
    setPreset(key);
    setLabel(DEFAULT_LABEL[key]);
  };

  const url = preset === "dues"
    ? (offerId ? `/PayDues?offer=${offerId}&club=${slug}` : "")
    : preset === "events"
      ? `/EventSignup?club=${slug}`
      : preset === "marketplace"
        ? `/Marketplace?club=${slug}`
        : customUrl.trim();

  const attach = () => {
    onAttach({ label: label.trim() || DEFAULT_LABEL[preset], url });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attach a payment link</DialogTitle>
          <DialogDescription>Add a pay or register button to your post.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => choosePreset(p.key)}
              className={`rounded-xl border p-2.5 text-left transition-colors ${preset === p.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
            >
              <p.icon className={`w-4 h-4 mb-1 ${preset === p.key ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-sm font-semibold">{p.label}</p>
              <p className="text-[11px] text-muted-foreground">{p.desc}</p>
            </button>
          ))}
        </div>

        {preset === "dues" && (
          <div>
            <Label className="mb-1.5 block text-xs">Dues offer</Label>
            {activeOffers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No dues offers yet — create one under Team Plans first.</p>
            ) : (
              <Select value={offerId} onValueChange={setOfferId}>
                <SelectTrigger><SelectValue placeholder="Choose a dues offer" /></SelectTrigger>
                <SelectContent>
                  {activeOffers.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {preset === "custom" && (
          <div>
            <Label className="mb-1.5 block text-xs">Link URL</Label>
            <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="/PayDues?offer=... or https://..." />
          </div>
        )}

        <div>
          <Label className="mb-1.5 block text-xs">Button label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Pay now" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={attach} disabled={!url}>Attach link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}