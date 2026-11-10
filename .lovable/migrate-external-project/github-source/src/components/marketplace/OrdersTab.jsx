import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search } from "lucide-react";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";

const STATUS_COLOR = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-200 text-slate-600",
};

export default function OrdersTab({ clubId }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["marketplace-orders", clubId],
    queryFn: () => base44.entities.MarketplaceOrder.filter({ club_id: clubId }, "-created_date", 200),
  });

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (o.order_number || "").toLowerCase().includes(q) || (o.customer_name || "").toLowerCase().includes(q) || (o.customer_email || "").toLowerCase().includes(q);
    }
    return true;
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by order #, name, or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <ResponsiveSelect
          className="min-w-[150px]"
          value={statusFilter}
          onChange={setStatusFilter}
          label="Order status"
          options={[
            { value: "all", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "paid", label: "Paid" },
            { value: "failed", label: "Failed" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{orders.length === 0 ? "No marketplace orders yet." : "No orders match your filter."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">{o.order_number}</span>
                      <Badge className={`text-xs ${STATUS_COLOR[o.status] || ""}`} variant="secondary">{o.status}</Badge>
                      {o.checkout_mode === "subscription" && <Badge variant="outline" className="text-xs">recurring</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{o.customer_name} · {o.customer_email}</p>
                    <div className="mt-2 space-y-0.5">
                      {(o.items || []).map((item, i) => (
                        <p key={i} className="text-xs text-slate-500">
                          {item.quantity > 1 && `${item.quantity}× `}{item.name}
                          {item.variant?.size && ` (${item.variant.size} ${item.variant.color || ""})`.trim()}
                          {item.dates?.length > 0 && ` — ${item.dates.join(", ")}`}
                          {item.type === "event_series" && " — Series Pass"}
                          {item.type === "event_bulk" && " — All-Days Pass"}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900">${(o.total || 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-400">{new Date(o.created_date || o.paid_date || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}