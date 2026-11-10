import React from 'react';
import { User, Headphones, Settings, Lock, Paperclip, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from './ticketStatusHelpers';

// Renders the message thread for a ticket. Different styling per author type.
// Internal notes are only passed in by the parent when the user is a system agent.
export default function TicketThread({ messages = [] }) {
  if (!messages.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        if (msg.message_type === 'status_change') {
          return (
            <div key={msg.id} className="flex items-center justify-center gap-2 py-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
                <Settings className="w-3 h-3" />
                <span>{msg.body}</span>
                <span className="text-muted-foreground/60">· {formatDateTime(msg.created_date)}</span>
              </div>
            </div>
          );
        }

        if (msg.message_type === 'auto_close') {
          return (
            <div key={msg.id} className="flex items-center justify-center py-1">
              <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-1.5 border border-amber-200 dark:border-amber-900">
                {msg.body}
              </div>
            </div>
          );
        }

        if (msg.message_type === 'satisfaction') {
          return (
            <div key={msg.id} className="flex items-center justify-center py-1">
              <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-1.5 border border-emerald-200 dark:border-emerald-900">
                <Star className="w-3 h-3 text-amber-500" />
                <span>Customer rated: {msg.metadata?.rating}/5</span>
                {msg.metadata?.comment && <span className="text-muted-foreground">— "{msg.metadata.comment}"</span>}
              </div>
            </div>
          );
        }

        const isAgent = msg.author_type === 'agent';
        const isSystem = msg.author_type === 'system';
        const isInternal = msg.is_internal;

        return (
          <div key={msg.id} className={`flex gap-2.5 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isInternal ? 'bg-amber-100 dark:bg-amber-900' :
              isAgent ? 'bg-primary' :
              isSystem ? 'bg-slate-300 dark:bg-slate-700' :
              'bg-muted'
            }`}>
              {isInternal ? <Lock className="w-4 h-4 text-amber-600" /> :
               isAgent ? <Headphones className="w-4 h-4 text-primary-foreground" /> :
               isSystem ? <Settings className="w-4 h-4 text-slate-600" /> :
               <User className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className={`flex-1 min-w-0 ${isAgent ? '' : 'flex flex-col items-end'}`}>
              <div className={`flex items-baseline gap-2 mb-0.5 ${isAgent ? '' : 'flex-row-reverse'}`}>
                <span className="text-xs font-medium">{msg.author_name}</span>
                {isInternal && <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400">Internal</Badge>}
                <span className="text-xs text-muted-foreground">{msg.author_role}</span>
              </div>
              <div className={`rounded-xl px-3 py-2 max-w-[85%] ${
                isInternal ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900' :
                isAgent ? 'bg-primary/10 dark:bg-primary/20 border border-primary/20' :
                isSystem ? 'bg-muted/50 border border-border' :
                'bg-muted border border-border'
              }`}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                {msg.attachments?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.attachments.map((uri, i) => (
                      <a key={i} href={uri} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Paperclip className="w-3 h-3" /> Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground/60 mt-0.5">{formatDateTime(msg.created_date)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}