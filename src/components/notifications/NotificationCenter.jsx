import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const NOTIFICATION_TYPES = {
  program_deadline: { icon: "⏰", color: "text-orange-600" },
  task_assignment: { icon: "✅", color: "text-blue-600" },
  expense_approval: { icon: "💰", color: "text-emerald-600" },
  mention: { icon: "💬", color: "text-purple-600" },
  program_assignment: { icon: "📋", color: "text-indigo-600" }
};

export default function NotificationCenter({ user }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, "-created_date"),
    enabled: !!user?.email,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Notification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate({
        id: notification.id,
        data: { ...notification, read: true }
      });
    }
  };

  const handleMarkAllAsRead = () => {
    notifications.filter(n => !n.read).forEach(notification => {
      markAsReadMutation.mutate({
        id: notification.id,
        data: { ...notification, read: true }
      });
    });
  };

  const handleDelete = (id) => {
    deleteNotificationMutation.mutate(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-slate-100"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const config = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.mention;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-slate-50 transition-colors cursor-pointer group",
                      !notification.read && "bg-blue-50/50"
                    )}
                    onClick={() => handleMarkAsRead(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={cn("font-medium text-sm", config.color)}>
                            {notification.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}