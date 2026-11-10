import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shirt } from "lucide-react";
import { useMarketplaceCart } from "@/lib/marketplaceCart";
import { toast } from "sonner";

export default function MarketplaceSpiritwearCard({ product }) {
  const [open, setOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const cart = useMarketplaceCart();

  const sizes = useMemo(() => {
    const set = new Set();
    (product.variants || []).forEach((v) => { if (v.size) set.add(v.size); });
    return [...set];
  }, [product]);
  const colors = useMemo(() => {
    const set = new Set();
    (product.variants || []).forEach((v) => { if (v.color) set.add(v.color); });
    return [...set];
  }, [product]);

  const matchingVariant = useMemo(() => {
    if (!selectedVariant?.size && !selectedVariant?.color) return null;
    return (product.variants || []).find(
      (v) => v.size === selectedVariant?.size && v.color === selectedVariant?.color
    );
  }, [selectedVariant, product]);

  const canAdd = matchingVariant && matchingVariant.in_stock;
  const displayPrice = matchingVariant?.price || product.base_price;

  const handleAdd = () => {
    if (!matchingVariant) { toast.error("Select a size and color."); return; }
    if (!matchingVariant.in_stock) { toast.error("That variant is out of stock."); return; }
    cart.addItem({
      type: "spiritwear",
      reference_id: product.id,
      name: product.name,
      variant: { size: matchingVariant.size, color: matchingVariant.color, sku: matchingVariant.sku },
      quantity: qty,
      unit_price: displayPrice,
      line_total: displayPrice * qty,
    });
    toast.success("Added to cart");
    setOpen(false);
    setSelectedVariant(null);
    setQty(1);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="aspect-square bg-slate-100 relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Shirt className="w-10 h-10" />
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col flex-1">
          <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{product.name}</h3>
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{product.description || product.category}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-slate-900">${product.base_price}</span>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add</Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {product.image_url && (
              <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              </div>
            )}
            {product.description && <p className="text-sm text-slate-600">{product.description}</p>}

            {sizes.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedVariant((prev) => ({ ...prev, size: s }))}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                        selectedVariant?.size === s ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Color</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedVariant((prev) => ({ ...prev, color: c }))}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                        selectedVariant?.color === c ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Quantity</p>
                <div className="flex items-center gap-2 mt-1">
                  <Button size="sm" variant="outline" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <Button size="sm" variant="outline" onClick={() => setQty((q) => q + 1)}>+</Button>
                </div>
              </div>
              <div className="text-right">
                {matchingVariant && !matchingVariant.in_stock && <Badge variant="destructive" className="mb-1">Out of stock</Badge>}
                <p className="text-lg font-bold">${(displayPrice * qty).toFixed(2)}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!canAdd}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}