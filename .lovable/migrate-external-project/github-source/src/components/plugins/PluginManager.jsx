import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, LayoutDashboard, ClipboardCheck, CreditCard, CheckCircle2, Power, Lock, Building2 } from "lucide-react";
import { isMasterAdmin } from "@/lib/rbac";

// Icon map for plugin icons stored in DB
const ICON_MAP = {
  LayoutDashboard,
  ClipboardCheck,
  CreditCard,
  Building2,
};

const COLOR_MAP = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: "bg-gradient-to-br from-blue-500 to-blue-700 text-white",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: "bg-gradient-to-br from-amber-500 to-amber-700 text-white",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
};

export default function PluginManager({ user }) {
  const queryClient = useQueryClient();
  const canToggle = isMasterAdmin(user);

  const { data: plugins = [], isLoading } = useQuery({
    queryKey: ["plugins"],
    queryFn: () => base44.entities.Plugin.list("order", 50),
  });

  const handleToggle = async (plugin) => {
    try {
      await base44.entities.Plugin.update(plugin.id, {
        is_active: !plugin.is_active,
        activated_by: user?.email,
        activated_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
    } catch (err) {
      console.error("Failed to toggle plugin:", err);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Power className="w-4 h-4 text-emerald-600" />
            Platform Plugins
          </CardTitle>
          {canToggle ? (
            <Badge className="bg-rose-100 text-rose-700 text-xs">Master Admin Controls</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-slate-500">
              <Lock className="w-3 h-3 mr-1" /> Toggle locked
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Modular plugins powering your club platform. {canToggle
            ? "Toggle plugins on or off — Contact us at Support@adisal.com to activate."
            : "Contact @support@Adisal.com to activate plugins."}
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {plugins.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No plugins configured.</p>
        ) : (
          plugins.map((plugin) => {
            const Icon = ICON_MAP[plugin.icon] || LayoutDashboard;
            const colors = COLOR_MAP[plugin.color] || COLOR_MAP.emerald;
            return (
              <div
                key={plugin.id}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  plugin.is_active
                    ? `${colors.bg} ${colors.border}`
                    : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{plugin.name}</p>
                    {plugin.is_active ? (
                      <Badge className={`text-xs ${colors.badge}`}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Activated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-slate-400">Deactivated</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plugin.description}</p>
                  {plugin.category && (
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">{plugin.category}</p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <Switch
                    checked={plugin.is_active}
                    onCheckedChange={() => handleToggle(plugin)}
                    disabled={!canToggle}
                  />
                  <span className="text-[10px] text-slate-400 font-medium">
                    {plugin.is_active ? "ON" : "OFF"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}