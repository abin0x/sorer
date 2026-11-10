import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, Trash2, CheckCheck, Circle, Mail, ListTodo, Receipt, MessageSquare, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from '@/lib/router-compat';

const NOTIFICATION_ICONS = {
  program_assignment: LayoutDashboard,
  task_assignment: ListTodo,
  expense_approval: Receipt,
  expense_rejection: Receipt,
  mention: MessageSquare,
  program_deadline: LayoutDashboard,
  budget_alert: Receipt,
  announcement: Bell,
};

export default function InboxTab({ user }) {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); toast.success("All notifications marked as read"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); toast.success("Notification deleted"); },
  });

  const handleClick = (n) => {
    if (!n.read) markAsReadMutation.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const filtered = notifications.filter((n) => (filter === "unread" ? !n.read : filter === "read" ? n.read : true));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")} className={`rounded-full shrink-0 ${filter === "all" ? "bg-primary" : ""}`}>All</Button>
          <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")} className={`rounded-full shrink-0 ${filter === "unread" ? "bg-primary" : ""}`}>Unread ({unreadCount})</Button>
          <Button variant={filter === "read" ? "default" : "outline"} size="sm" onClick={() => setFilter("read")} className={`rounded-full shrink-0 ${filter === "read" ? "bg-primary" : ""}`}>Read</Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllAsReadMutation.mutate()} disabled={unreadCount === 0} className="rounded-full shrink-0">
          <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> <span className="hidden sm:inline">Mark All Read</span><span className="sm:hidden">Mark Read</span>
        </Button>
      </div>

      <Card className="border-border/60 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[380px]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((n) => {
                  const Icon = NOTIFICATION_ICONS[n.type] || Bell;
                  return (
                    <div
                      key={n.id}
                      className={`p-3.5 sm:p-4 hover:bg-muted/40 cursor-pointer transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                      onClick={() => handleClick(n)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!n.read ? "bg-gradient-to-br from-primary to-accent" : "bg-muted"}`}>
                          <Icon className={`w-4 h-4 ${!n.read ? "text-white" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[11px] text-muted-foreground/70 mt-1.5">{format(new Date(n.created_date), "MMM d, yyyy h:mm a")}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!n.read && <Circle className="w-2 h-2 fill-primary text-primary" />}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}