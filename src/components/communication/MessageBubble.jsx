import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip } from "lucide-react";
import { format } from "date-fns";

function isImageFile(url, fileName) {
  const exts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  return exts.some((ext) => (fileName?.toLowerCase() || "").endsWith(ext)) || (url || "").match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
}

export default function MessageBubble({ message: msg, isOwn }) {
  const isImage = msg.message_type === "file" && isImageFile(msg.file_url, msg.file_name);

  return (
    <div className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}>
      <Avatar className="w-7 h-7 shrink-0">
        <AvatarFallback className={`text-[10px] ${isOwn ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-primary/20 to-accent/20 text-primary"}`}>
          {msg.sender_name?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col max-w-[75%] sm:max-w-md ${isOwn ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] font-medium text-foreground">{isOwn ? "You" : msg.sender_name}</span>
          <span className="text-[10px] text-muted-foreground">{format(new Date(msg.created_date), "h:mm a")}</span>
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
            isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted border border-border text-foreground rounded-tl-sm"
          }`}
        >
          {isImage ? (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
              <img src={msg.file_url} alt={msg.file_name} className="max-w-full rounded-lg max-h-48 object-contain" />
            </a>
          ) : msg.message_type === "file" ? (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />{msg.file_name}
            </a>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}