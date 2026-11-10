import React, { useState } from "react";
import { Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/lib/TenantContext";
import { canManageMarketing } from "@/lib/marketing/useMarketingData";
import MarketingDashboardTab from "@/components/marketing/MarketingDashboardTab";
import MarketingCalendarTab from "@/components/marketing/MarketingCalendarTab";
import TemplatesTab from "@/components/marketing/TemplatesTab";
import SettingsTab from "@/components/marketing/SettingsTab";
import PlansTab from "@/components/marketing/PlansTab";
import BrandKitTab from "@/components/marketing/BrandKitTab";
import MarketingDialogs from "@/components/marketing/MarketingDialogs";

export default function Marketing() {
  const { effectiveClubId: clubId, user } = useTenant();
  const [composer, setComposer] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const canEdit = canManageMarketing(user);

  if (!clubId) return <div className="p-8 text-muted-foreground">Select a club to manage its marketing.</div>;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary" /> Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">Turn every event into social posts, and plan promotion on one calendar.</p>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="brandkit">Brand Kit</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4"><MarketingDashboardTab clubId={clubId} user={user} onComposer={setComposer} onCampaign={setCampaign} /></TabsContent>
        <TabsContent value="calendar" className="mt-4"><MarketingCalendarTab clubId={clubId} onComposer={setComposer} onCampaign={setCampaign} /></TabsContent>
        <TabsContent value="plans" className="mt-4"><PlansTab clubId={clubId} canEdit={canEdit} /></TabsContent>
        <TabsContent value="brandkit" className="mt-4"><BrandKitTab clubId={clubId} canEdit={canEdit} /></TabsContent>
        <TabsContent value="templates" className="mt-4"><TemplatesTab clubId={clubId} canEdit={canEdit} /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab clubId={clubId} canEdit={canEdit} /></TabsContent>
      </Tabs>
      <MarketingDialogs clubId={clubId} user={user} composer={composer} campaign={campaign} onCloseComposer={() => setComposer(null)} onCloseCampaign={() => setCampaign(null)} />
    </div>
  );
}