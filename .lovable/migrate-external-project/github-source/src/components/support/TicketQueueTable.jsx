import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight } from 'lucide-react';
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, CATEGORY_LABELS,
  slaProgress, relativeTime,
} from './ticketStatusHelpers';

// Reusable ticket queue table for the Support Console.
// Server-side paginated — receives one page of tickets at a time.
export default function TicketQueueTable({
  tickets = [],
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onOpenTicket,
  selectedTicketId,
  showClub = true,
}) {
  const allSelected = tickets.length > 0 && tickets.every(t => selectedIds.includes(t.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="w-8 p-2">
              <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} />
            </th>
            <th className="text-left p-2 font-medium">Ticket</th>
            <th className="text-left p-2 font-medium hidden md:table-cell">Status</th>
            <th className="text-left p-2 font-medium hidden lg:table-cell">Priority</th>
            {showClub && <th className="text-left p-2 font-medium hidden xl:table-cell">Club</th>}
            <th className="text-left p-2 font-medium hidden lg:table-cell">Assignee</th>
            <th className="text-left p-2 font-medium hidden xl:table-cell">SLA</th>
            <th className="text-left p-2 font-medium hidden md:table-cell">Updated</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => {
            const sla = slaProgress(ticket);
            const isSelected = selectedTicketId === ticket.id;
            return (
              <tr
                key={ticket.id}
                onClick={() => onOpenTicket(ticket)}
                className={`border-b border-border cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
              >
                <td className="p-2" onClick={(e) => { e.stopPropagation(); onToggleSelect?.(ticket.id); }}>
                  <Checkbox checked={selectedIds.includes(ticket.id)} />
                </td>
                <td className="p-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{ticket.ticket_number}</span>
                    <span className="font-medium truncate">{ticket.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[ticket.category] || ticket.category}</Badge>
                    <span className="text-xs text-muted-foreground truncate">{ticket.submitted_by_name}</span>
                  </div>
                </td>
                <td className="p-2 hidden md:table-cell">
                  <Badge className={STATUS_COLORS[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
                </td>
                <td className="p-2 hidden lg:table-cell">
                  <Badge className={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge>
                </td>
                {showClub && <td className="p-2 hidden xl:table-cell text-xs truncate max-w-[120px]">{ticket.club_name}</td>}
                <td className="p-2 hidden lg:table-cell text-xs">{ticket.assigned_to_name || '—'}</td>
                <td className="p-2 hidden xl:table-cell">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${sla.breached ? 'bg-red-500' : sla.pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(sla.pct, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs ${sla.breached ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                      {sla.label}
                    </span>
                  </div>
                </td>
                <td className="p-2 hidden md:table-cell text-xs text-muted-foreground">{relativeTime(ticket.last_message_at || ticket.created_date)}</td>
                <td className="p-2"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}