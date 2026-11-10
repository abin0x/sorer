import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function SpiritwearDialog({ open, onOpenChange, offer, onAdd }) {
  const config = offer.config || {};
  const variants = config.variants || [];

  const colors = useMemo(() => {
    const seen = new Set();
    return variants.filter((v) => {
      if (!v.color || seen.has(v.color)) return false;
      seen.add(v.color);
      return true;
    }).map((v) => v.color);
  }, [variants]);

  const sizes = useMemo(() => {
    const seen = new Set();
    return variants.filter((v) => {
      if (!v.size || seen.has(v.size)) return false;
      seen.add(v.size);
      return true;
    }).map((v) => v.size);
  }, [variants]);

  const [color, setColor] = useState(colors[0] || "");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [fulfillment, setFulfillment] = useState(
    config.fulfillment_options?.[0] || "pickup",
  );

  // Find the matching variant for the selected color+size
  const selectedVariant = useMemo(
    () => variants.find((v) => v.color === color && v.size === size),
    [variants, color, size],
  );

  // Which sizes are in stock for the selected color?
  const sizeAvailability = useMemo(() => {
    const map = {};
    for (const s of sizes) {
      const v = variants.find((v) => v.color === color && v.size === s);
      map[s] = v ? v.in_stock !== false : false;
    }
    return map;
  }, [variants, color, sizes]);

  // Image for the selected color (or fallback to offer image)
  const currentImage = useMemo(() => {
    const v = variants.find((v) => v.color === color && v.image_url);
    return v?.image_url || offer.image_url;
  }, [variants, color, offer.image_url]);

  const unitPrice = selectedVariant?.price || config.base_price || 0;
  const extraPrice =
    (customName && config.allow_custom_name_number ? Number(config.custom_name_price || 0) : 0) +
    (customNumber && config.allow_custom_name_number ? Number(config.custom_number_price || 0) : 0);
  const lineTotal = (unitPrice + extraPrice) * qty;

  // Order window check
  const orderWindowClosed = config.order_window_closes &&
    new Date().toISOString().split("T")[0] > config.order_window_closes;

  const handleAdd = () => {
    if (!size) {
      toast.error("Please select a size");
      return;
    }
    if (!selectedVariant) {
      toast.error("That size/color combination is not available");
      return;
    }
    onAdd({
      type: "spiritwear",
      offer_id: offer.id,
      name: offer.name,
      image_url: currentImage,
      variant: { size, color, sku: selectedVariant.sku },
      custom_name: customName,
      custom_number: customNumber,
      fulfillment,
      quantity: qty,
      unit_price: unitPrice + extraPrice,
      line_total: lineTotal,
      access: offer.access,
    });
    toast.success(`${offer.name} added to cart`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{offer.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Image */}
          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
            {currentImage ? (
              <img src={currentImage} alt={offer.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-slate-300" />
              </div>
            )}
          </div>

          {/* Selection */}
          <div className="space-y-4">
            {/* Color swatches */}
            {colors.length > 1 && (
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Color</Label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setSize(""); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition ${
                        color === c
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size buttons */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Size</Label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const available = sizeAvailability[s];
                  return (
                    <button
                      key={s}
                      onClick={() => available && setSize(s)}
                      disabled={!available}
                      className={`min-w-[3rem] px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition ${
                        !available
                          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through"
                          : size === s
                            ? "border-primary bg-primary/5"
                            : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom name/number */}
            {config.allow_custom_name_number && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-slate-500">Custom Name {config.custom_name_price ? `(+$${config.custom_name_price})` : ""}</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Optional"
                    maxLength={20}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Jersey Number {config.custom_number_price ? `(+$${config.custom_number_price})` : ""}</Label>
                  <Input
                    value={customNumber}
                    onChange={(e) => setCustomNumber(e.target.value)}
                    placeholder="Optional"
                    maxLength={3}
                  />
                </div>
              </div>
            )}

            {/* Fulfillment */}
            {config.fulfillment_options?.length > 1 && (
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Delivery</Label>
                <RadioGroup value={fulfillment} onValueChange={setFulfillment}>
                  <div className="flex gap-3">
                    {config.fulfillment_options.includes("shipping") && (
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="shipping" id="ship" />
                        <Label htmlFor="ship" className="text-sm cursor-pointer">Ship to me</Label>
                      </div>
                    )}
                    {config.fulfillment_options.includes("pickup") && (
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="text-sm cursor-pointer">Pick up at practice</Label>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <Label className="text-xs text-slate-500">Qty</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(Math.max(1, qty - 1))}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <span className="w-8 text-center font-medium">{qty}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(qty + 1)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Price + Add */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <span className="text-xs text-slate-400">Total</span>
                <span className="text-xl font-bold text-slate-900 ml-1">${lineTotal.toFixed(2)}</span>
              </div>
              <Button onClick={handleAdd} disabled={orderWindowClosed}>
                <ShoppingBag className="w-4 h-4 mr-1.5" />
                Add to Cart
              </Button>
            </div>

            {orderWindowClosed && (
              <p className="text-xs text-red-500 text-center">This team store has closed.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}