import React from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/theme/ThemeToggle";
import ClubLogo from "@/components/branding/ClubLogo";
import ClubSwitcher from '@/components/branding/ClubSwitcher';
import ContextualHelp from "@/components/help/ContextualHelp";
import { ROOT_TAB_PATHS } from "@/lib/TabNavigationContext";

// Unified app header. Shows a back button (window.history.back) whenever the
// user is not on one of the root tab pages, so the native WebView back gesture
// and the header back button stay in sync with the browser history stack.
export default function AppHeader({ clubName, user, tenant }) {
  const location = useLocation();
  const isRoot = ROOT_TAB_PATHS.has(location.pathname);
  const showBack = !isRoot;

  const handleBack = () => window.history.back();

  return (
    <header
      className="safe-top bg-card/95 backdrop-blur-lg border-b border-border px-4 lg:px-6 pt-3 pb-3 lg:pb-4 shadow-sm"
      style={{ WebkitUserSelect: "none" }}
    >
      <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1 lg:gap-4 min-w-0 flex-1">
        {showBack && (
          <button
            onClick={handleBack}
            title="Back"
            className="select-none p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 text-slate-600 dark:text-slate-300 flex items-center justify-center"
            style={{ WebkitUserSelect: "none" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <SidebarTrigger className="select-none hover:bg-slate-100 dark:hover:bg-slate-800 p-2 min-h-[44px] min-w-[44px] rounded-lg transition-colors duration-200" />
        <div className="flex items-center gap-2 min-w-0">
          <ClubLogo primaryColor={tenant?.brand?.primary_color} size={32} className="shadow-sm shrink-0" />
          <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-white truncate select-none">
            {clubName}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {tenant?.viewingTenant && (
          <Button variant="outline" size="sm" onClick={() => tenant.clearTenant()} className="gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Back to Console
          </Button>
        )}
        <ContextualHelp userId={user?.id} />
        {user && <NotificationBell user={user} />}
        <ThemeToggle />
      </div>
      </div>
      <ClubSwitcher />
    </header>
  );
}