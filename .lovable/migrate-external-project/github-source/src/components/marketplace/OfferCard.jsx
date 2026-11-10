import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Lock, Calendar, Shirt, ArrowRight } from "lucide-react";
import SpiritwearDialog from "./SpiritwearDialog";
import EventDialog from "./EventDialog";

const TYPE_LABEL = {
  event: "Event",
  spiritwear: "Spiritwear",
};

const TYPE_BUTTON = {
  event: "Register",
  spiritwear: "Select Options",
};

function getStartingPrice(offer) {
  if (offer.type === "spiritwear") {
    const variants = offer.config?.variants || [];
    const prices = variants.map((v) => v.price || offer.config?.base_price || 0).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : offer.config?.base_price || 0;
  }
  if (offer.type === "event") {
    const opts = offer.config?.price_options || [];
    const prices = opts.map((p) => p.price || 0).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }
  return 0;
}

export default function OfferCard({ offer, onAddToCart }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const startingPrice = getStartingPrice(offer);
  const isMembersOnly = offer.access === "members_only";

  let badgeEl = null;
  if (offer.badge === "new") {
    badgeEl = <span className="text-[11px] font-semibold uppercase tracking-wider text-white bg-slate-900 px-2.5 py-1">New</span>;
  } else if (offer.badge === "hot") {
    badgeEl = <span className="text-[11px] font-semibold uppercase tracking-wider text-white bg-orange-600 px-2.5 py-1">Hot</span>;
  } else if (isMembersOnly) {
    badgeEl = (
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white bg-violet-600 px-2.5 py-1 flex items-center gap-1">
        <Lock className="w-3 h-3" /> Members
      </span>
    );
  } else if (offer.type === "event" && offer.config?.spots_left != null) {
    const spots = offer.config.spots_left;
    if (spots > 0 && spots <= 5) {
      badgeEl = <span className="text-[11px] font-semibold uppercase tracking-wider text-white bg-red-500 px-2.5 py-1">{spots} Left</span>;
    }
  }

  const handleAdd = (item) => {
    onAddToCart(item);
    setDialogOpen(false);
  };

  return (
    <>
      <div className="group cursor-pointer" onClick={() => setDialogOpen(true)}>
        {/* Image */}
        <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
          {offer.image_url ? (
            <img
              src={offer.image_url}
              alt={offer.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
              <Shirt className="w-12 h-12 text-slate-300" />
            </div>
          )}

          {/* Badge top-left */}
          {badgeEl && <div className="absolute top-3 left-3 z-10">{badgeEl}</div>}

          {/* Hover overlay with action button */}
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors duration-300 flex items-end justify-center pb-6">
            <div className="opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
              <span className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 text-sm font-semibold tracking-wide shadow-lg">
                {TYPE_BUTTON[offer.type]}
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Text below image — Uncode editorial style */}
        <div className="pt-3 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-1">
            {TYPE_LABEL[offer.type]}
          </p>
          <h3 className="font-medium text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-slate-600 transition-colors">
            {offer.name}
          </h3>

          {/* Event meta */}
          {offer.type === "event" && offer.config?.start_date && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {offer.config.schedule_type === "recurring"
                  ? `${offer.config.available_dates?.length || 0} sessions`
                  : offer.config.schedule_type === "multi_date"
                    ? `${offer.config.available_dates?.length || 0} days`
                    : new Date(offer.config.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              {offer.config.location && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="truncate">{offer.config.location}</span>
                </>
              )}
            </div>
          )}

          {/* Price */}
          <div className="mt-2">
            {startingPrice > 0 ? (
              <span className="text-sm font-semibold text-slate-900">
                {offer.type === "spiritwear" && <span className="text-slate-400 font-normal mr-1">From</span>}
                ${startingPrice.toFixed(2)}
              </span>
            ) : (
              <span className="text-sm font-semibold text-emerald-600">Free</span>
            )}
          </div>
        </div>
      </div>

      {/* Type-specific dialog */}
      {offer.type === "spiritwear" && (
        <SpiritwearDialog open={dialogOpen} onOpenChange={setDialogOpen} offer={offer} onAdd={handleAdd} />
      )}
      {offer.type === "event" && (
        <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} offer={offer} onAdd={handleAdd} />
      )}
    </>
  );
}