import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, MapPin, Clock, Users, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function EventDialog({ open, onOpenChange, offer, onAdd }) {
  const config = offer.config || {};
  const priceOptions = config.price_options || [];
  const availableDates = config.available_dates || [];

  const [priceKey, setPriceKey] = useState(priceOptions[0]?.key || "");
  const [selectedDates, setSelectedDates] = useState([]);
  const [participantName, setParticipantName] = useState("");
  const [addonAnswers, setAddonAnswers] = useState({});

  const selectedOption = priceOptions.find((p) => p.key === priceKey);
  const needsDates = selectedOption?.type === "individual" || selectedOption?.type === "per_day" || selectedOption?.type === "drop_in";
  const isDropIn = selectedOption?.type === "drop_in";

  const spotsLeft = config.spots_left != null ? config.spots_left : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0 && !config.allow_waitlist;

  // Early bird
  const today = new Date().toISOString().split("T")[0];
  const earlyBirdActive = config.early_bird?.until && today <= config.early_bird.until;
  const earlyBirdPrice = earlyBirdActive ? Number(config.early_bird.price || 0) : null;

  const unitPrice = useMemo(() => {
    if (!selectedOption) return 0;
    let base = Number(selectedOption.price || 0);
    if (earlyBirdPrice !== null && earlyBirdPrice < base) {
      if (needsDates) base = earlyBirdPrice * (isDropIn ? 1 : selectedDates.length || 1);
      else base = earlyBirdPrice;
    } else if (needsDates) {
      base = base * (isDropIn ? 1 : selectedDates.length || 1);
    }
    return base;
  }, [selectedOption, earlyBirdPrice, needsDates, isDropIn, selectedDates.length]);

  const lineTotal = unitPrice;

  const toggleDate = (date) => {
    if (isDropIn) {
      setSelectedDates([date]);
    } else {
      setSelectedDates((prev) =>
        prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
      );
    }
  };

  const handleAdd = () => {
    if (!priceKey) {
      toast.error("Please select a price option");
      return;
    }
    if (needsDates && selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }
    if (isDropIn && selectedDates.length === 0) {
      toast.error("Please select a date");
      return;
    }
    if (!participantName.trim()) {
      toast.error("Please enter the participant's name");
      return;
    }

    // Validate required addon questions
    for (const q of config.addon_questions || []) {
      if (q.required && !addonAnswers[q.key]?.trim()) {
        toast.error(`Please answer: ${q.label}`);
        return;
      }
    }

    onAdd({
      type: "event",
      offer_id: offer.id,
      name: offer.name,
      image_url: offer.image_url,
      price_option_key: priceKey,
      price_option_name: selectedOption.name,
      dates: needsDates ? selectedDates : [],
      participant: { name: participantName, ...addonAnswers },
      quantity: 1,
      unit_price: unitPrice,
      line_total: lineTotal,
      access: offer.access,
    });
    toast.success(`${offer.name} added to cart`);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{offer.name}</DialogTitle>
        </DialogHeader>

        {/* Event details */}
        <div className="space-y-1.5 text-sm text-slate-600">
          {config.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {config.schedule_type === "single"
                  ? formatDate(config.start_date)
                  : `${availableDates.length} ${config.schedule_type === "recurring" ? "sessions" : "days"}`}
              </span>
            </div>
          )}
          {config.start_time && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{config.start_time} – {config.end_time}</span>
            </div>
          )}
          {config.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{config.location}</span>
            </div>
          )}
          {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 10 && (
            <div className="flex items-center gap-2 text-amber-600 font-medium">
              <Users className="w-4 h-4" />
              <span>Only {spotsLeft} spots left!</span>
            </div>
          )}
          {isFull && (
            <div className="flex items-center gap-2 text-red-600 font-medium">
              <Users className="w-4 h-4" />
              <span>This event is full{config.allow_waitlist ? " — waitlist available" : ""}</span>
            </div>
          )}
        </div>

        {/* Price options */}
        <div>
          <Label className="text-xs text-slate-500 mb-1.5 block">Choose an option</Label>
          <RadioGroup value={priceKey} onValueChange={(v) => { setPriceKey(v); setSelectedDates([]); }}>
            <div className="space-y-2">
              {priceOptions.map((opt) => (
                <div key={opt.key} className="flex items-center gap-2 p-2.5 rounded-lg border-2 border-slate-200 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value={opt.key} id={opt.key} />
                  <Label htmlFor={opt.key} className="flex-1 cursor-pointer">
                    <span className="font-medium text-sm">{opt.name}</span>
                    {earlyBirdActive && earlyBirdPrice !== null && earlyBirdPrice < opt.price && (
                      <span className="text-xs text-emerald-600 ml-1.5">Early bird ${earlyBirdPrice}</span>
                    )}
                  </Label>
                  <span className="font-semibold text-sm">${Number(opt.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Date selection */}
        {needsDates && availableDates.length > 0 && (
          <div>
            <Label className="text-xs text-slate-500 mb-1.5 block">
              {isDropIn ? "Select a date" : "Select dates"}
            </Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {availableDates.map((date) => {
                const checked = selectedDates.includes(date);
                return (
                  <div key={date} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                    <Checkbox checked={checked} onCheckedChange={() => toggleDate(date)} id={date} />
                    <Label htmlFor={date} className="text-sm cursor-pointer flex-1">{formatDate(date)}</Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Participant info */}
        <div>
          <Label className="text-xs text-slate-500 mb-1.5 block">Participant Name</Label>
          <Input
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="Player's full name"
          />
        </div>

        {/* Addon questions */}
        {(config.addon_questions || []).map((q) => (
          <div key={q.key}>
            <Label className="text-xs text-slate-500 mb-1.5 block">
              {q.label} {q.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              value={addonAnswers[q.key] || ""}
              onChange={(e) => setAddonAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
              placeholder={q.placeholder || ""}
            />
          </div>
        ))}

        {/* Price + Add */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <span className="text-xs text-slate-400">Total</span>
            <span className="text-xl font-bold text-slate-900 ml-1">${lineTotal.toFixed(2)}</span>
          </div>
          <Button onClick={handleAdd} disabled={isFull && !config.allow_waitlist}>
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            {isFull && config.allow_waitlist ? "Join Waitlist" : "Add to Cart"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}