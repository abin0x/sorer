import React from "react";
import { useNavigate } from '@/lib/router-compat';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag, Lock, Calendar, Shirt, CreditCard } from "lucide-react";
import { useOfferCart } from "@/lib/offerCart";
import { getHostname, getClubSlugFromHostname } from "@/lib/tenantResolver";

const TYPE_ICON = {
  dues: CreditCard,
  event: Calendar,
  spiritwear: Shirt,
};

function ItemDetails({ item }) {
  if (item.type === "spiritwear") {
    return (
      <span className="text-xs text-slate-500">
        {item.variant?.size} {item.variant?.color}
        {item.custom_name && ` · ${item.custom_name}`}
        {item.custom_number && ` #${item.custom_number}`}
        {item.fulfillment === "shipping" ? " · Ship" : " · Pickup"}
      </span>
    );
  }
  if (item.type === "event") {
    return (
      <span className="text-xs text-slate-500">
        {item.price_option_name}
        {item.dates?.length > 0 && ` · ${item.dates.length} date${item.dates.length > 1 ? "s" : ""}`}
        {item.participant?.name && ` · ${item.participant.name}`}
      </span>
    );
  }
  if (item.type === "dues") {
    return (
      <span className="text-xs text-slate-500">
        {item.payment_plan === "monthly" ? "Monthly" : item.payment_plan === "split_guardians" ? "Split" : "Full"}
        {item.player?.name && ` · ${item.player.name}`}
      </span>
    );
  }
  return null;
}

export default function CartDrawer({ open, onOpenChange }) {
  const cart = useOfferCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onOpenChange(false);
    const slug = getClubSlugFromHostname(getHostname());
    const params = new URLSearchParams();
    if (slug) params.set("club", slug);
    if (cart.club_id) params.set("club_id", cart.club_id);
    const qs = params.toString();
    navigate(`/MarketplaceCart${qs ? `?${qs}` : ""}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Your Cart ({cart.itemCount})
          </SheetTitle>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Your cart is empty</p>
              <p className="text-xs mt-1">Browse the tabs to add items.</p>
            </div>
          ) : (
            cart.items.map((item) => {
              const Icon = TYPE_ICON[item.type] || ShoppingBag;
              return (
                <div key={item._key} className="flex gap-3 p-2 rounded-lg border border-slate-100">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{item.name}</p>
                    <ItemDetails item={item} />
                    <div className="flex items-center justify-between mt-1.5">
                      {/* Quantity */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => cart.updateQuantity(item._key, (item.quantity || 1) - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-xs font-medium w-5 text-center">{item.quantity || 1}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => cart.updateQuantity(item._key, (item.quantity || 1) + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-semibold text-sm">${((item.line_total || (item.unit_price || 0) * (item.quantity || 1))).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-red-500 shrink-0"
                    onClick={() => cart.removeItem(item._key)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div className="p-4 border-t space-y-3">
            {cart.hasMembersOnly && (
              <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
                <Lock className="w-3.5 h-3.5" />
                <span>Some items require sign-in at checkout</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Subtotal</span>
              <span className="text-lg font-bold text-slate-900">${cart.subtotal.toFixed(2)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={handleCheckout}>
              Checkout
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Continue Shopping
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}