import React, { useState } from "react";
import { useTenant } from "@/lib/TenantContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Calendar, Shirt, CreditCard, Package } from "lucide-react";
import MarketplaceEventsTab from "@/components/marketplace/MarketplaceEventsTab";
import SpiritwearTab from "@/components/marketplace/SpiritwearTab";
import SubscriptionsTab from "@/components/marketplace/SubscriptionsTab";
import OrdersTab from "@/components/marketplace/OrdersTab";

export default function MarketplaceManager() {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const [tab, setTab] = useState("events");

  if (!clubId) {
    return <div className="p-8 text-center text-slate-500">Select a club to manage its marketplace.</div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" /> Marketplace Manager
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage your club's online store — events, team dues, spiritwear, and orders.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full mb-4">
          <TabsTrigger value="events" className="flex items-center gap-1.5 text-xs sm:text-sm"><Calendar className="w-4 h-4" /> Events</TabsTrigger>
          <TabsTrigger value="spiritwear" className="flex items-center gap-1.5 text-xs sm:text-sm"><Shirt className="w-4 h-4" /> Spiritwear</TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-1.5 text-xs sm:text-sm"><CreditCard className="w-4 h-4" /> Team Dues</TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1.5 text-xs sm:text-sm"><Package className="w-4 h-4" /> Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="events"><MarketplaceEventsTab clubId={clubId} /></TabsContent>
        <TabsContent value="spiritwear"><SpiritwearTab clubId={clubId} /></TabsContent>
        <TabsContent value="subscriptions"><SubscriptionsTab clubId={clubId} /></TabsContent>
        <TabsContent value="orders"><OrdersTab clubId={clubId} /></TabsContent>
      </Tabs>
    </div>
  );
}