import React from "react";
import { CheckCircle2 } from "lucide-react";

/** A poll attached to a channel message — the message content is the question. */
export default function MessagePoll({ message, onVote, viewerEmail }) {
  const options = message.poll_options || [];
  const votes = message.poll_votes || {};
  const total = options.reduce((sum, o) => sum + (votes[o.id]?.length || 0), 0);
  const myVote = options.find((o) => (votes[o.id] || []).includes(viewerEmail))?.id;

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold whitespace-pre-wrap">{message.content}</p>
      {options.map((option) => {
        const count = votes[option.id]?.length || 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        const mine = myVote === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onVote(message, option.id)}
            className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              mine ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            }`}
          >
            <span className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${pct}%` }} />
            <span className="relative flex items-center gap-2">
              {mine && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
              <span className="font-medium truncate">{option.text}</span>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">{count} · {pct}%</span>
            </span>
          </button>
        );
      })}
      <p className="text-[11px] text-muted-foreground">
        {total} vote{total === 1 ? "" : "s"}{myVote ? " · tap another option to change your vote" : ""}
      </p>
    </div>
  );
}