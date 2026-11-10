import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function NotificationBadge({ user, type }) {
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.email, type],
    queryFn: () => base44.entities.Notification.filter({ 
      user_email: user?.email,
      read: false,
      ...(type && { type })
    }),
    enabled: !!user?.email,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const count = notifications.length;

  if (count === 0) return null;

  return (
    <div className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full px-1.5 shadow-lg">
      {count > 99 ? '99+' : count}
    </div>
  );
}