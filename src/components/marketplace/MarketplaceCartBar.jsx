import React from "react";
import { useNavigate } from '@/lib/router-compat';
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

export default function MarketplaceCartBar({ itemCount, subtotal }) {
  const navigate = useNavigate();
  if (itemCount === 0) return null;

  return (
    <div className="safe-bottom fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <ShoppingBag className="w-6 h-6 text-slate-700" />
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
            <p className="text-sm font-bold text-slate-900">${subtotal.toFixed(2)}</p>
          </div>
        </div>
        <Button onClick={() => navigate("/MarketplaceCart")}>
          View Cart
        </Button>
      </div>
    </div>
  );
}