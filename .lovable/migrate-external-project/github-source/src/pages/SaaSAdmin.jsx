import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, LayoutDashboard, Building2, Users, CreditCard, Settings, LifeBuoy, ExternalLink, Target, Play, ArrowLeftRight, Zap, Layers, Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getSubdomainUrl } from "@/lib/tenantResolver";
import { useTenant } from "@/lib/TenantContext";
import OverviewTab from "@/components/saas/OverviewTab";
import TenantOpsDashboard from "@/components/saas/ops/TenantOpsDashboard";
import TenantsTab from "@/components/saas/TenantsTab";
import UsersTab from "@/components/saas/UsersTab";
import BillingTab from "@/components/saas/BillingTab";
import ConfigTab from "@/components/saas/ConfigTab";
import SupportTab from "@/components/saas/SupportTab";
import SupportTicketsTab from "@/components/saas/SupportTicketsTab";
import TestSettingsTab from "@/components/saas/TestSettingsTab";
import DemoAccessTab from "@/components/saas/DemoAccessTab";
import MigrationsTab from "@/components/saas/MigrationsTab";
import MigrationsReviewBanner from "@/components/saas/MigrationsReviewBanner";
import SignupRequestsTab from "@/components/saas/SignupRequestsTab";
import ModuleAccessTab from "@/components/modules/ModuleAccessTab";
import InviteClubDialog from "@/components/saas/signup/InviteClubDialog";
import OutreachTab from "@/components/outreach/OutreachTab";

export default function SaaSAdmin() {
  const [clubs, setClubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const setTab = (newTab) => setSearchParams({ tab: newTab });
  const [selectedClubId, setSelectedClubId] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        base44.entities.Club.list("-created_date", 200),
        base44.entities.SubscriptionPlan.list("sort_order", 20)
      ]);
      setClubs(c);
      setPlans(p);
      if (c.length && !selectedClubId) setSelectedClubId(c[0].id);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { selectTenant } = useTenant();
  const selectedClub = clubs.find((c) => c.id === selectedClubId);
  const openDirectorView = () => {
    if (!selectedClub?.slug) return;
    selectTenant(selectedClub.slug);
  };

  const isSystemOwner = currentUser?.system_role === 'system_owner' || currentUser?.is_super_admin === true;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header band */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-4 lg:px-8 py-6 lg:py-8 rounded-b-3xl shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl lg:text-2xl font-extrabold text-white">Club Rudder System Console</h1>
              <p className="text-indigo-200 text-xs lg:text-sm">Manage every tenant, user, billing, and configuration across the platform.</p>
            </div>
            <InviteClubDialog onInvited={load} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-5 -mt-2">
        {/* Tenant selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 flex-1">
            <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Select a tenant…" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClub && (
              <span className="text-xs text-slate-400 hidden sm:inline truncate">
                {getSubdomainUrl(selectedClub.slug)}
              </span>
            )}
          </div>
          <Button onClick={openDirectorView} disabled={!selectedClub?.slug} className="gap-2">
            <ExternalLink className="w-4 h-4" /> Open Director View
          </Button>
        </div>

        <MigrationsReviewBanner onOpenMigrations={() => setTab("migrations")} />

        <Tabs value={tab} onValueChange={setTab}>
          <div>
            <TabsContent value="overview" className="mt-4">
              <TenantOpsDashboard clubs={clubs} plans={plans} loading={loading} onTabChange={setTab} onReload={load} onProvision={() => setTab("tenants")} />
            </TabsContent>
            <TabsContent value="tenants" className="mt-4">
              <TenantsTab clubs={clubs} plans={plans} loading={loading} onReload={load} />
            </TabsContent>
            <TabsContent value="signups" className="mt-4">
              <SignupRequestsTab />
            </TabsContent>
            <TabsContent value="migrations" className="mt-4">
              <MigrationsTab clubs={clubs} />
            </TabsContent>
            <TabsContent value="users" className="mt-4">
              <UsersTab clubs={clubs} />
            </TabsContent>
            <TabsContent value="billing" className="mt-4">
              <BillingTab clubs={clubs} plans={plans} />
            </TabsContent>
            <TabsContent value="modules" className="mt-4">
              <ModuleAccessTab clubs={clubs} />
            </TabsContent>
            <TabsContent value="config" className="mt-4">
              <ConfigTab plans={plans} loading={loading} onReload={load} />
            </TabsContent>
            <TabsContent value="demo" className="mt-4">
              <DemoAccessTab />
            </TabsContent>
            <TabsContent value="tests" className="mt-4">
              <TestSettingsTab selectedClubId={selectedClubId} clubs={clubs} />
            </TabsContent>
            <TabsContent value="tickets" className="mt-4">
              <SupportTicketsTab clubs={clubs} />
            </TabsContent>
            {isSystemOwner && (
              <TabsContent value="outreach" className="mt-4">
                <OutreachTab />
              </TabsContent>
            )}
            <TabsContent value="support" className="mt-4">
              <SupportTab clubs={clubs} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}