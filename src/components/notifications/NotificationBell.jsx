import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { useNavigate } from '@/lib/router-compat';

const NOTIFICATION_ICONS = {
  program_assignment: "📋",
  task_assignment: "✓",
  expense_approval: "💰",
  mention: "@",
  program_deadline: "⏰",
  budget_alert: "⚠️",
  announcement: "📢",
  task_completed: "✅",
  expense_submitted: "💸",
  new_message: "💬"
};

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        return await base44.entities.Notification.filter({ user_email: user.email }, "-created_date", 50);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return [];
      }
    },
    enabled: !!user?.email,
    refetchInterval: 10000, // More frequent updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => base44.entities.Notification.update(n.id, { read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    const link = notification.link;
    if (!link) return;
    // Notifications link to app routes; an absolute URL still needs a real redirect.
    if (link.startsWith("http")) window.location.assign(link);
    else navigate(link);
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 dark:bg-slate-900 dark:border-slate-800" align="end">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800">
          <h3 className="font-semibold text-lg dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllAsReadMutation.isPending}
              className="dark:text-slate-300"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-950' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {NOTIFICATION_ICONS[notification.type] || "📌"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-semibold text-sm ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${!notification.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        {new Date(notification.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}