import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { billingApi } from "@/lib/facilityBillingApi";
import ModuleLockedScreen from "@/components/modules/ModuleLockedScreen";
import InvoicesTab from "@/components/billing/InvoicesTab";
import BillingEntitiesTab from "@/components/billing/BillingEntitiesTab";
import StripeSettingsCard from "@/components/billing/StripeSettingsCard";

export default function FacilityBilling() {
  const { data, isLoading } = useQuery({
    queryKey: ["facility-billing"],
    queryFn: () => billingApi({ action: "overview" }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (data?.module_active === false) {
    return (
      <ModuleLockedScreen
        title="Facility Billing"
        description="Turn on the Facilities module to invoice outside organizations for field rentals."
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Facility Billing</h1>
        <p className="text-sm text-muted-foreground">
          Invoice outside organizations for field rentals, and keep track of what has been paid.
        </p>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="entities">Organizations</TabsTrigger>
          <TabsTrigger value="setup">Payments setup</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="entities">
          <BillingEntitiesTab />
        </TabsContent>
        <TabsContent value="setup">
          <StripeSettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}