import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pin, CheckCircle2 } from "lucide-react";
import MessageAttachment from "@/components/beacon/MessageAttachment";
import MessagePoll from "@/components/beacon/MessagePoll";
import MessageActionLink from "@/components/beacon/MessageActionLink";

const QUICK_REACTIONS = ["👍", "❤️", "🎉"];

export default function ChannelMessageItem({ message, channel, isOwn, onReact, onAcknowledge, onVote, canSeeAckCount, audienceSize }) {
  const isPoll = (message.poll_options?.length || 0) > 0;
  const ackCount = message.acknowledged_by?.length || 0;
  const iAcked = message.acknowledged_by?.includes(message.__viewerEmail);

  const body = (
    <>
      {!isPoll && message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
      {isPoll && <MessagePoll message={message} onVote={onVote} viewerEmail={message.__viewerEmail} />}
      {message.image_uri && <MessageAttachment uri={message.image_uri} kind="image" />}
      {message.attachment_uri && (
        <MessageAttachment uri={message.attachment_uri} kind={message.attachment_kind || "file"} name={message.attachment_name} />
      )}
      <MessageActionLink label={message.action_label} url={message.action_url} />
    </>
  );

  const reactionRow = (
    <div className="flex gap-1">
      {QUICK_REACTIONS.map((emoji) => (
        <button key={emoji} onClick={() => onReact(message, emoji)} className="text-sm px-1.5 py-0.5 rounded-full hover:bg-muted">
          {emoji} {message.reactions?.[emoji]?.length > 0 && <span className="text-[11px] text-muted-foreground">{message.reactions[emoji].length}</span>}
        </button>
      ))}
    </div>
  );

  // Announcements (no open replies) and polls read as cards rather than bubbles.
  if (channel.allow_replies === false || isPoll) {
    return (
      <div className={`rounded-2xl border p-4 ${message.is_priority ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-border bg-card"}`}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            {message.is_priority && <Badge className="bg-amber-500 text-white gap-1"><Pin className="w-3 h-3" /> Priority</Badge>}
            <span className="font-semibold text-sm text-foreground">{message.author_name}</span>
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">{format(new Date(message.created_date), "MMM d, h:mm a")}</span>
        </div>
        <div className="space-y-1.5">{body}</div>
        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/60">
          {reactionRow}
          {message.ack_required && (
            <Button
              size="sm"
              variant={iAcked ? "secondary" : "outline"}
              className="h-7 text-xs rounded-full ml-auto"
              onClick={() => onAcknowledge(message)}
              disabled={iAcked}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {iAcked ? "Got it ✓" : "Got it"}
            </Button>
          )}
          {message.ack_required && canSeeAckCount && (
            <span className="text-[11px] text-muted-foreground">{ackCount}/{audienceSize || "?"} acknowledged</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"} ${message.is_priority ? "ring-2 ring-amber-400" : ""}`}>
        {!isOwn && <p className="text-[11px] font-semibold opacity-80 mb-0.5">{message.author_name}</p>}
        {message.is_priority && <Badge className="bg-amber-500 text-white gap-1 mb-1"><Pin className="w-3 h-3" /> Priority</Badge>}
        <div className="space-y-1.5">{body}</div>
        <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{format(new Date(message.created_date), "h:mm a")}</p>
      </div>
    </div>
  );
}