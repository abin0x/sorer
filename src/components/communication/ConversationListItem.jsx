import React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function ConversationListItem({ program, lastMessage, unreadCount, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-2.5 rounded-xl text-left transition-colors flex items-start gap-2.5 ${
        active ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
        {program.title?.[0]?.toUpperCase() || "#"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm text-foreground truncate">{program.title}</h3>
          {lastMessage && <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(lastMessage.created_date), "MMM d")}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {lastMessage && (
            <p className="text-xs text-muted-foreground truncate">{lastMessage.sender_name}: {lastMessage.message}</p>
          )}
          {unreadCount > 0 && <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0 rounded-full">{unreadCount}</Badge>}
        </div>
      </div>
    </button>
  );
}