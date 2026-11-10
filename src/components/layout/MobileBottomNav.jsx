import React from "react";
import { useTabNavigation } from "@/lib/TabNavigationContext";
import { useModuleAccess } from '@/lib/useModuleAccess';
import { useTenant } from '@/lib/TenantContext';
import { moduleForRoute } from '@/lib/moduleRoutes';
import { Button } from '@/components/ui/button';

// Persistent bottom tab bar for the five primary sections. Stays fixed at the
// bottom on mobile. Stack preservation (returning to the exact sub-page you
// left) is handled by TabNavigationContext — tapping the active tab pops to
// that tab's root page.
export default function MobileBottomNav() {
  const { activeTab, navigateToTab, tabs } = useTabNavigation();
  const { hasModule } = useModuleAccess();
  const tenant = useTenant();
  const visibleTabs = tabs.filter(tab => (tenant.isSystemUser && !tenant.effectiveClubId) || !moduleForRoute(tab.rootPath) || hasModule(moduleForRoute(tab.rootPath)));

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border flex items-stretch pb-[max(env(safe-area-inset-bottom),12px)]">
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Button variant="ghost"
            key={tab.key}
            onClick={() => navigateToTab(tab.key)}
            className={`select-none flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[44px] transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
            style={{ WebkitUserSelect: "none", WebkitTapHighlightColor: "transparent" }}
          >
            <tab.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}