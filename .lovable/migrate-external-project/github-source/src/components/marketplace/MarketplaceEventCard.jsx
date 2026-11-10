import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock, CheckCircle2 } from "lucide-react";
import { useMarketplaceCart } from "@/lib/marketplaceCart";
import { toast } from "sonner";

const TYPE_LABEL = { camp: "Camp", class: "Class", clinic: "Clinic", tournament: "Tournament", open_play: "Open Play", social: "Social" };

export default function MarketplaceEventCard({ event }) {
  const [open, setOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [mode, setMode] = useState("individual"); // individual | series | bulk
  const cart = useMarketplaceCart();

  const isRecurring = event.schedule_type === "recurring";
  const isMultiDay = event.schedule_type === "multi_date";
  const hasPassOption = isRecurring || isMultiDay;
  const dates = event.available_dates || [];
  const spotsLeft = event.capacity > 0 ? event.capacity - (event.registered_count || 0) : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  const handleAdd = () => {
    if (hasPassOption && mode === "individual" && selectedDates.length === 0) {
      toast.error("Select at least one date.");
      return;
    }
    if (mode === "series") {
      cart.addItem({
        type: "event_series",
        reference_id: event.id,
        name: event.name,
        dates: dates,
        quantity: 1,
        unit_price: event.series_price || event.price * dates.length,
        line_total: event.series_price || event.price * dates.length,
      });
    } else if (mode === "bulk") {
      cart.addItem({
        type: "event_bulk",
        reference_id: event.id,
        name: event.name,
        dates: dates,
        quantity: 1,
        unit_price: event.bulk_price || event.price * dates.length,
        line_total: event.bulk_price || event.price * dates.length,
      });
    } else {
      const datesToAdd = hasPassOption ? selectedDates : [event.start_date];
      cart.addItem({
        type: "event",
        reference_id: event.id,
        name: event.name,
        dates: datesToAdd,
        quantity: 1,
        unit_price: event.price,
        line_total: event.price * datesToAdd.length,
      });
    }
    toast.success("Added to cart");
    setOpen(false);
    setSelectedDates([]);
    setMode("individual");
  };

  const toggleDate = (d) => {
    setSelectedDates((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const passPrice = isRecurring
    ? (event.series_price || event.price * dates.length)
    : (event.bulk_price || event.price * dates.length);
  const passLabel = isRecurring ? "Series Pass" : "All-Days Pass";

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col sm:flex-row">
        {event.image_url && (
          <div className="sm:w-32 h-32 shrink-0 bg-slate-100">
            <img src={event.image_url} alt={event.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge variant="outline" className="text-xs mb-1">{TYPE_LABEL[event.type] || "Event"}</Badge>
              <h3 className="font-bold text-slate-900">{event.name}</h3>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-slate-900">${event.price}</p>
              {spotsLeft !== null && (
                <p className={`text-xs ${isFull ? "text-red-500" : "text-slate-500"}`}>
                  {isFull ? "Full" : `${spotsLeft} spots left`}
                </p>
              )}
            </div>
          </div>
          {event.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{event.description}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{event.start_date}</span>
            {event.start_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{event.start_time}{event.end_time ? `–${event.end_time}` : ""}</span>}
            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
          </div>
          <div className="mt-3">
            <Button size="sm" onClick={() => setOpen(true)} disabled={isFull && !event.allow_waitlist}>
              {isFull ? "Join Waitlist" : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{event.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {event.description && <p className="text-sm text-slate-600">{event.description}</p>}
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{event.start_date}</span>
              {event.start_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{event.start_time}{event.end_time ? `–${event.end_time}` : ""}</span>}
              {event.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{event.location}</span>}
            </div>

            {hasPassOption && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode("individual")}
                    className={`flex-1 p-3 rounded-lg border-2 text-left transition ${mode === "individual" ? "border-primary bg-primary/5" : "border-slate-200"}`}
                  >
                    <p className="font-semibold text-sm">Individual Dates</p>
                    <p className="text-xs text-slate-500">${event.price} per date</p>
                  </button>
                  <button
                    onClick={() => setMode(isRecurring ? "series" : "bulk")}
                    className={`flex-1 p-3 rounded-lg border-2 text-left transition ${mode !== "individual" ? "border-primary bg-primary/5" : "border-slate-200"}`}
                  >
                    <p className="font-semibold text-sm">{passLabel}</p>
                    <p className="text-xs text-slate-500">${passPrice} for all {dates.length} dates</p>
                  </button>
                </div>

                {mode === "individual" && (
                  <div>
                    <p className="text-sm font-medium mb-2">Select dates:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {dates.map((d) => (
                        <button
                          key={d}
                          onClick={() => toggleDate(d)}
                          className={`p-2 rounded-lg border text-sm text-center transition ${
                            selectedDates.includes(d) ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
                        </button>
                      ))}
                    </div>
                    {selectedDates.length > 0 && (
                      <p className="text-sm text-slate-600 mt-2">Total: <span className="font-bold">${(event.price * selectedDates.length).toFixed(2)}</span></p>
                    )}
                  </div>
                )}
                {mode !== "individual" && (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm">
                    <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />All {dates.length} dates included</p>
                    <p className="mt-1">Total: <span className="font-bold">${passPrice.toFixed(2)}</span></p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}