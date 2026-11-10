import React, { useCallback } from "react";
import { Link, useSearchParams } from '@/lib/router-compat';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { queryClientInstance } from "@/lib/query-client";
import { usePullToRefresh } from "@/lib/PullToRefreshContext";
import { Button } from "@/components/ui/button";
import { Radio, Mail, Bell, MessageSquare, ChevronLeft, Loader2, Hash, Settings } from "lucide-react";
import { createPageUrl } from "@/utils";
import ComposeTab from "@/components/communication/ComposeTab";
import InboxTab from "@/components/communication/InboxTab";
import ConversationsTab from "@/components/communication/ConversationsTab";
import ChannelsView from "@/components/beacon/ChannelsView";
import NotificationSettingsPanel from "@/components/beacon/NotificationSettingsPanel";

const TABS = [
  { key: "channels", label: "Channels", icon: Hash },
  { key: "compose", label: "Broadcast", icon: Mail },
  { key: "inbox", label: "Inbox", icon: Bell },
  { key: "conversations", label: "Chats", icon: MessageSquare },
  { key: "settings", label: "Settings", icon: Settings },
];

export default function CommunicationPortal() {
  // Pull-to-refresh: re-fetch all active queries on this page.
  const handleRefresh = useCallback(() => queryClientInstance.refetchQueries({ type: "active" }), []);
  usePullToRefresh(handleRefresh);

  const [searchParams] = useSearchParams();
  const recipientEmail = searchParams.get("recipient_email");
  const recipientName = searchParams.get("recipient_name");
  const initialRecipient = recipientEmail ? { email: recipientEmail, name: recipientName || "" } : null;

  // The active section lives in the URL, so each one is a real page in history
  // and the system back button returns to the section the user came from.
  const tabParam = searchParams.get("tab");
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : "channels";
  const tabUrl = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    return `${createPageUrl("CommunicationPortal")}?${next.toString()}`;
  };

  const { data: user, isLoading } = useQuery({ queryKey: ["comm-portal-user"], queryFn: () => base44.auth.me() });
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, "-created_date"),
    enabled: !!user?.email,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shrink-0">
                <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">Beacon</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Your club's messaging hub — announcements, inbox, and conversations.</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full shrink-0 hidden sm:flex">
              <Link to={createPageUrl("RoleDashboard")}><ChevronLeft className="w-4 h-4 mr-1" /> Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0 sm:hidden">
              <Link to={createPageUrl("RoleDashboard")}><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Segmented tab bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Beacon sections" className="flex gap-1 py-2 overflow-x-auto">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Link
                  key={t.key}
                  to={tabUrl(t.key)}
                  aria-current={active ? "page" : undefined}
                  className={`relative shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                    active ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <t.icon className="w-4 h-4" aria-hidden="true" />
                  <span>{t.label}</span>
                  {t.key === "inbox" && unreadCount > 0 && (
                    <span
                      aria-label={`${unreadCount} unread`}
                      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full ${
                        active ? "bg-white text-primary" : "bg-red-500 text-white"
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {tab === "channels" && <ChannelsView user={user} />}
        {tab === "compose" && <ComposeTab user={user} initialRecipient={initialRecipient} />}
        {tab === "inbox" && <InboxTab user={user} />}
        {tab === "conversations" && <ConversationsTab user={user} />}
        {tab === "settings" && <NotificationSettingsPanel user={user} />}
      </div>
    </div>
  );
}