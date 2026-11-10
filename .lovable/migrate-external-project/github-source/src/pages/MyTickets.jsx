import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, ChevronRight, Search } from 'lucide-react';
import TicketDetailPanel from '@/components/support/TicketDetailPanel';
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, CATEGORY_LABELS,
  relativeTime,
} from '@/components/support/ticketStatusHelpers';
import AsyncState from '@/components/shared/AsyncState';

export default function MyTickets() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadTickets();
    }).catch(() => setLoading(false));
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Ticket.filter(
        {},
        { sort: '-created_date', limit: 100 }
      );
      setTickets(res.items || res || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.ticket_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (selectedTicket) {
    return (
      <div className="h-[calc(100dvh-120px)]">
        <TicketDetailPanel
          ticket={selectedTicket}
          user={user}
          onBack={() => { setSelectedTicket(null); loadTickets(); }}
          onUpdated={loadTickets}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your support requests and view responses from our team.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject or ticket number..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['all', ...Object.keys(STATUS_LABELS)].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <AsyncState isLoading loadingLabel="Loading your tickets..." />
      ) : filtered.length === 0 ? (
        <AsyncState isEmpty emptyTitle="No tickets yet" emptyMessage="Need help with something? Click 'Get Help' on any page to submit a support ticket." />
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => (
            <button
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="w-full text-left rounded-xl border border-border p-3 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{ticket.ticket_number}</span>
                  <span className="font-medium truncate">{ticket.subject}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={STATUS_COLORS[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
                  <Badge className={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                <span>·</span>
                <span>{relativeTime(ticket.last_message_at || ticket.created_date)}</span>
                {ticket.message_count > 1 && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {ticket.message_count}
                    </span>
                  </>
                )}
                {ticket.satisfaction_rating && (
                  <>
                    <span>·</span>
                    <span className="text-amber-500">★ {ticket.satisfaction_rating}/5</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}