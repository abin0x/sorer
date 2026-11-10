import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from '@/lib/router-compat';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Save, X, Headphones, Tag, ArrowLeft } from 'lucide-react';
import TicketQueueTable from '@/components/support/TicketQueueTable';
import TicketDetailPanel from '@/components/support/TicketDetailPanel';
import {
  STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS,
  canAccessConsole,
} from '@/components/support/ticketStatusHelpers';
import AsyncState from '@/components/shared/AsyncState';
import { useToast } from '@/components/ui/use-toast';

const SAVED_VIEWS_KEY = 'supportConsoleSavedViews';
const PAGE_SIZE = 50;

export default function SupportConsole() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    search: '',
    slaState: 'all',
  });
  const [savedViews, setSavedViews] = useState([]);
  const [viewName, setViewName] = useState('');
  const [showSaveView, setShowSaveView] = useState(false);

  // Bulk action
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (!canAccessConsole(u)) {
        navigate('/');
        return;
      }
      // Check URL for ticket param
      const params = new URLSearchParams(location.search);
      const ticketId = params.get('ticket');
      if (ticketId) {
        base44.entities.Ticket.get(ticketId).then(t => setSelectedTicket(t)).catch(() => {});
      }
      loadTickets();
    }).catch(() => setLoading(false));

    // Load saved views
    try {
      const sv = localStorage.getItem(SAVED_VIEWS_KEY);
      if (sv) setSavedViews(JSON.parse(sv));
    } catch {}
  }, []);

  const loadTickets = async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const query = {};
      if (filters.status !== 'all') query.status = filters.status;
      if (filters.priority !== 'all') query.priority = filters.priority;
      if (filters.category !== 'all') query.category = filters.category;
      if (filters.search) {
        query.subject = { $regex: filters.search, $options: 'i' };
      }

      const res = await base44.entities.Ticket.filter(query, {
        sort: '-created_date',
        limit: PAGE_SIZE,
        cursor: reset ? undefined : cursor,
      });

      const items = res.items || res || [];
      setTickets(prev => reset ? items : [...prev, ...items]);
      setHasMore(res.has_more || false);
      setCursor(res.next_cursor || null);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) loadTickets(true);
  }, [filters.status, filters.priority, filters.category, filters.search]);

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleSelectAll = () => {
    if (tickets.every(t => selectedIds.includes(t.id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tickets.map(t => t.id));
    }
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    try {
      await base44.entities.Ticket.bulkUpdate(
        selectedIds.map(id => ({ id, status: bulkStatus }))
      );
      toast({ title: `Updated ${selectedIds.length} tickets to ${STATUS_LABELS[bulkStatus]}` });
      setSelectedIds([]);
      setBulkStatus('');
      loadTickets();
    } catch (err) {
      toast({ title: 'Bulk update failed', variant: 'destructive' });
    }
  };

  const handleBulkPriority = async () => {
    if (!bulkPriority || selectedIds.length === 0) return;
    try {
      await base44.entities.Ticket.bulkUpdate(
        selectedIds.map(id => ({ id, priority: bulkPriority }))
      );
      toast({ title: `Updated ${selectedIds.length} tickets to ${bulkPriority}` });
      setSelectedIds([]);
      setBulkPriority('');
      loadTickets();
    } catch (err) {
      toast({ title: 'Bulk update failed', variant: 'destructive' });
    }
  };

  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const view = { name: viewName, filters: { ...filters } };
    const updated = [...savedViews, view];
    setSavedViews(updated);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    setViewName('');
    setShowSaveView(false);
    toast({ title: 'View saved' });
  };

  const handleLoadView = (view) => {
    setFilters(view.filters);
  };

  const handleDeleteView = (idx) => {
    const updated = savedViews.filter((_, i) => i !== idx);
    setSavedViews(updated);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
  };

  if (selectedTicket) {
    return (
      <div className="h-[calc(100dvh-120px)]">
        <TicketDetailPanel
          ticket={selectedTicket}
          user={user}
          onBack={() => { setSelectedTicket(null); loadTickets(); }}
          onUpdated={() => loadTickets()}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Headphones className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Support Console</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage support tickets across all clubs.</p>
      </div>

      {/* Saved views */}
      {savedViews.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Saved views:</span>
          {savedViews.map((v, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                onClick={() => handleLoadView(v)}
                className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 transition-colors"
              >
                {v.name}
              </button>
              <button onClick={() => handleDeleteView(i)} className="text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search subjects..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger className="w-auto h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
          <SelectTrigger className="w-auto h-9 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
          <SelectTrigger className="w-auto h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowSaveView(!showSaveView)} className="gap-1.5">
          <Save className="w-3.5 h-3.5" /> Save View
        </Button>
      </div>

      {showSaveView && (
        <div className="flex items-center gap-2 mb-3">
          <Input
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="View name..."
            className="h-8 max-w-xs text-sm"
          />
          <Button size="sm" onClick={handleSaveView}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSaveView(false)}>Cancel</Button>
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="h-4 w-px bg-border" />
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-auto h-8 text-xs"><SelectValue placeholder="Change status..." /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleBulkStatus} disabled={!bulkStatus}>Apply</Button>
          <div className="h-4 w-px bg-border" />
          <Select value={bulkPriority} onValueChange={setBulkPriority}>
            <SelectTrigger className="w-auto h-8 text-xs"><SelectValue placeholder="Change priority..." /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleBulkPriority} disabled={!bulkPriority}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
        </div>
      )}

      {/* Queue table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {loading ? (
          <AsyncState isLoading loadingLabel="Loading tickets..." />
        ) : tickets.length === 0 ? (
          <AsyncState isEmpty emptyTitle="No tickets found" emptyMessage="Try adjusting your filters." />
        ) : (
          <>
            <TicketQueueTable
              tickets={tickets}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onOpenTicket={setSelectedTicket}
              selectedTicketId={selectedTicket?.id}
            />
            {hasMore && (
              <div className="p-3 text-center border-t border-border">
                <Button variant="outline" size="sm" onClick={() => loadTickets(false)} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}