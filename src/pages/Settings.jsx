import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon } from "lucide-react";
import NotificationPreferences from "../components/settings/NotificationPreferences";
import PermissionsGuide from "../components/reports/PermissionsGuide";
import EditablePermissionsMatrix from "../components/settings/EditablePermissionsMatrix";
import DataManagement from "../components/settings/DataManagement";
import TemplateManager from "../components/templates/TemplateManager";
import DeleteAccount from "../components/settings/DeleteAccount";
import { Link } from '@/lib/router-compat';
import { Shield, FileText } from "lucide-react";

export default function Settings() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin" || user?.custom_role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-slate-600 mt-1">Manage your preferences and system settings</p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="dark:bg-slate-900 overflow-x-auto overflow-y-hidden flex-nowrap w-full justify-start sm:justify-center">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            {isAdmin && <TabsTrigger value="templates">Templates</TabsTrigger>}
            {isAdmin && <TabsTrigger value="data">Data Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="permissions">Edit Permissions</TabsTrigger>}
            {isAdmin && <TabsTrigger value="guide">Permissions Guide</TabsTrigger>}
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <NotificationPreferences user={user} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="templates">
              <TemplateManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="data">
              <DataManagement />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="permissions">
              <EditablePermissionsMatrix />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="guide">
              <PermissionsGuide />
            </TabsContent>
          )}

          <TabsContent value="account" className="space-y-6">
            <DeleteAccount user={user} />
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="font-semibold text-foreground">Legal & Privacy</h3>
              <Link to="/privacy-policy" className="flex items-center gap-3 py-2 min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Shield className="w-4 h-4" /> Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="flex items-center gap-3 py-2 min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors">
                <FileText className="w-4 h-4" /> Terms of Service
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}