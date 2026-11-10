import React, { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useAdminCompliance from "@/components/compliance/useAdminCompliance";
import OverviewTab from "@/components/compliance/OverviewTab";
import PendingQueueTab from "@/components/compliance/PendingQueueTab";
import MissingReportTab from "@/components/compliance/MissingReportTab";
import SettingsTab from "@/components/compliance/SettingsTab";
import AuditHistoryTab from "@/components/compliance/AuditHistoryTab";
import { isComplianceAdmin } from "@/lib/compliance";

export default function AdminCompliance() {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  const { data, isLoading, isError, error } = useAdminCompliance(user);

  if (!user) return <div className="flex justify-center p-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!isComplianceAdmin(user)) return <p className="p-8 text-slate-500">Compliance is available to club admins and branch directors.</p>;
  if (isLoading) return <div className="flex justify-center p-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (isError) return <div className="p-8 text-center text-red-500"><ShieldAlert className="w-8 h-8 mx-auto mb-2" /><p>Failed to load compliance data.</p><p className="text-xs text-slate-400 mt-1">{error?.message}</p></div>;
  if (!data) return <div className="p-8 text-center text-slate-500">No compliance data available for your club.</div>;

  const pendingCount = data.records.filter((r) => r.status === "pending").length;
  const unconfigured = !data.settings?.governing_bodies?.length;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Risk Management &amp; Compliance</h1>
          <p className="text-sm text-slate-500">{data.season ? `${data.season.name} season` : "No active season"}</p>
        </div>
      </div>
      <Tabs defaultValue={unconfigured ? "settings" : "overview"}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending">Pending Review{pendingCount ? ` (${pendingCount})` : ""}</TabsTrigger>
          <TabsTrigger value="report">Missing / Expired</TabsTrigger>
          <TabsTrigger value="settings">Governing Bodies</TabsTrigger>
          <TabsTrigger value="audit">Audit History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab data={data} /></TabsContent>
        <TabsContent value="pending" className="mt-4"><PendingQueueTab data={data} /></TabsContent>
        <TabsContent value="report" className="mt-4"><MissingReportTab data={data} /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab data={data} /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditHistoryTab data={data} /></TabsContent>
      </Tabs>
    </div>
  );
}