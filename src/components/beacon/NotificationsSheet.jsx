import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageCircle, CheckCheck, Settings, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import NativeSheet from "@/components/beacon/NativeSheet";
import { haptic } from "@/lib/haptics";

function ago(d) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Beacon inbox: unread chat summary plus this person's own alerts (reads stay under the database rules). */
export default function NotificationsSheet({ open, onClose, user, unreadMessages = 0, onOpenMessages, onMarkMessagesRead }) {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["beacon-notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date", 50).catch(() => []),
    enabled: !!user?.email,
    refetchInterval: 60000,
  });
  const unreadAlerts = items.filter((n) => !n.read);
  const markOne = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beacon-notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: async () => {
      await Promise.all(unreadAlerts.map((n) => base44.entities.Notification.update(n.id, { read: true })));
      if (onMarkMessagesRead) await onMarkMessagesRead();
    },
    onSuccess: () => { haptic("success"); qc.invalidateQueries({ queryKey: ["beacon-notifications"] }); qc.invalidateQueries({ queryKey: ["beacon-unread"] }); },
  });
  const openItem = (n) => {
    if (!n.read) markOne.mutate(n.id);
    if (n.link) { onClose(); window.location.assign(n.link); }
  };
  const nothing = !unreadMessages && !items.length;

  return (
    <NativeSheet open={open} onClose={onClose} title="Notifications">
      <div className="flex items-center justify-between mt-1 mb-3">
        <p className="text-sm text-muted-foreground">{unreadAlerts.length + (unreadMessages ? 1 : 0) ? "You have new activity" : "You're all caught up"}</p>
        <button type="button" disabled={markAll.isPending || (!unreadAlerts.length && !unreadMessages)} onClick={() => markAll.mutate()} className="flex items-center gap-1 text-sm font-bold text-primary disabled:opacity-40 min-h-[44px] px-2">
          <CheckCheck className="w-4 h-4" />Mark all read
        </button>
      </div>
      {unreadMessages > 0 && (
        <button type="button" onClick={() => { onClose(); onOpenMessages(); }} className="w-full flex items-center gap-3 rounded-2xl border-2 border-primary bg-primary/10 p-3 text-left mb-2 active:scale-[0.98] transition">
          <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground grid place-items-center"><MessageCircle className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0"><span className="block font-bold">{unreadMessages} unread message{unreadMessages === 1 ? "" : "s"}</span><span className="block text-xs text-muted-foreground">Open your team channels</span></span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      {nothing && <div className="py-10 text-center text-muted-foreground"><Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />No notifications yet.</div>}
      <ul className="space-y-2 max-h-[55vh] overflow-y-auto">
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => openItem(n)} className={`w-full flex gap-3 rounded-2xl border p-3 text-left active:scale-[0.98] transition ${n.read ? "border-border bg-card" : "border-foreground/30 bg-muted"}`}>
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-destructive"}`} />
              <span className="flex-1 min-w-0">
                <span className="flex items-baseline gap-2"><span className={`flex-1 truncate ${n.read ? "font-medium" : "font-bold"}`}>{n.title || "Update"}</span><span className="text-[11px] text-muted-foreground shrink-0">{n.created_date ? ago(n.created_date) : ""}</span></span>
                {n.message && <span className="block text-sm text-muted-foreground line-clamp-2">{n.message}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => window.location.assign("/communicationportal?tab=settings")} className="mt-3 w-full flex items-center gap-2 rounded-2xl border border-border p-3 text-sm font-semibold min-h-[48px]">
        <Settings className="w-4 h-4" /><span className="flex-1 text-left">Notification preferences & quiet hours</span><ChevronRight className="w-4 h-4" />
      </button>
    </NativeSheet>
  );
}
