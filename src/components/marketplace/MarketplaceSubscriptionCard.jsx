import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check } from "lucide-react";
import { useMarketplaceCart } from "@/lib/marketplaceCart";
import { toast } from "sonner";

const INTERVAL_LABEL = { one_time: "One-time", monthly: "per month", yearly: "per year" };

export default function MarketplaceSubscriptionCard({ subscription }) {
  const cart = useMarketplaceCart();

  const handleAdd = () => {
    cart.addItem({
      type: "subscription",
      reference_id: subscription.id,
      name: subscription.name,
      quantity: 1,
      unit_price: subscription.price,
      line_total: subscription.price,
    });
    toast.success("Added to cart");
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <CreditCard className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-900">{subscription.name}</h3>
        {subscription.description && <p className="text-sm text-slate-500 mt-1">{subscription.description}</p>}
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="text-xl font-bold text-slate-900">${subscription.price}</span>
            <span className="text-sm text-slate-500 ml-1">{INTERVAL_LABEL[subscription.billing_interval] || ""}</span>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Check className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}