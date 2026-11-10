import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Lock, Tag, Clock, Monitor, User, Headphones, ArrowLeft, Building2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import TicketThread from './TicketThread';
import MacroPicker from './MacroPicker';
import SatisfactionRating from './SatisfactionRating';
import TenantContextPanel from './TenantContextPanel';
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  CATEGORY_LABELS, slaProgress, formatDateTime, relativeTime,
  canAccessConsole,
} from './ticketStatusHelpers';

// Full ticket detail view: header, thread, reply box, and sidebar.
// Used by both MyTickets (customer) and SupportConsole (agent).
// The `isAgent` prop controls whether internal notes, macros, status/priority
// controls, and the tenant context panel are shown.
export default function TicketDetailPanel({ ticket, user, onBack, onUpdated }) {
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [statusChange, setStatusChange] = useState('');
  const [priority, setPriority] = useState(ticket.priority || 'P3');
  const [assignedTo, setAssignedTo] = useState(ticket.assigned_to_name || '');
  const [tags, setTags] = useState(ticket.tags || []);
  const [newTag, setNewTag] = useState('');
  const [sending, setSending] = useState(false);
  const [macros, setMacros] = useState([]);
  const [showContext, setShowContext] = useState(false);
  const { toast } = useToast();

  const isAgent = canAccessConsole(user);
  const sla = slaProgress(ticket);

  useEffect(() => {
    loadMessages();
  }, [ticket.id]);

  useEffect(() => {
    if (isAgent) loadMacros();
  }, [isAgent, ticket.club_id]);

  const loadMessages = async () => {
    setLoadingMsgs(true);
    try {
      const res = await base44.entities.TicketMessage.filter(
        { ticket_id: ticket.id },
        { sort: 'created_date', limit: 200 }
      );
      setMessages(res.items || res || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const loadMacros = async () => {
    try {
      const res = await base44.entities.Macro.filter(
        { is_active: true },
        { sort: '-usage_count', limit: 50 }
      );
      setMacros(res.items || res || []);
    } catch {
      setMacros([]);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const payload = {
        ticket_id: ticket.id,
        body: replyBody.trim(),
        is_internal: isInternal,
      };
      if (statusChange) payload.status_change = statusChange;
      await base44.functions.invoke('reply-ticket', payload);
      setReplyBody('');
      setStatusChange('');
      setIsInternal(false);
      await loadMessages();
      onUpdated?.();
      toast({ title: isInternal ? 'Internal note added' : 'Reply sent' });
    } catch (err) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handlePriorityChange = async (val) => {
    setPriority(val);
    try {
      await base44.entities.Ticket.update(ticket.id, { priority: val });
      onUpdated?.();
    } catch {
      toast({ title: 'Failed to update priority', variant: 'destructive' });
    }
  };

  const handleAssign = async () => {
    try {
      await base44.entities.Ticket.update(ticket.id, {
        assigned_to_id: user.id,
        assigned_to_name: user.full_name,
      });
      onUpdated?.();
      toast({ title: 'Assigned to you' });
    } catch {
      toast({ title: 'Failed to assign', variant: 'destructive' });
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const updated = [...tags, newTag.trim()];
    setTags(updated);
    setNewTag('');
    try {
      await base44.entities.Ticket.update(ticket.id, { tags: updated });
    } catch {
      toast({ title: 'Failed to add tag', variant: 'destructive' });
    }
  };

  const handleRemoveTag = async (tag) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    try {
      await base44.entities.Ticket.update(ticket.id, { tags: updated });
    } catch {}
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-start gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-sm font-semibold">{ticket.ticket_number}</span>
              <Badge className={STATUS_COLORS[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
              <Badge className={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge>
              <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[ticket.category] || ticket.category}</Badge>
              {ticket.auto_closed && <Badge variant="outline" className="text-xs bg-amber-50">Auto-closed</Badge>}
            </div>
            <h2 className="text-lg font-bold truncate">{ticket.subject}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Opened {relativeTime(ticket.created_date)} by {ticket.submitted_by_name} ({ticket.submitted_by_role})
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main: thread + reply */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <TicketThread messages={messages} />
            )}

            {/* Satisfaction rating for customers on resolved tickets */}
            {!isAgent && ticket.status === 'resolved' && !ticket.satisfaction_rating && (
              <div className="mt-4">
                <SatisfactionRating ticket={ticket} onRated={() => onUpdated?.()} />
              </div>
            )}
          </div>

          {/* Reply box */}
          <div className="border-t border-border p-3 space-y-2 bg-muted/30">
            {isAgent && (
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={statusChange} onValueChange={setStatusChange}>
                  <SelectTrigger className="h-8 w-auto text-xs">
                    <SelectValue placeholder="Change status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <MacroPicker
                  macros={macros}
                  ticket={ticket}
                  agentName={user?.full_name}
                  onInsert={(body) => setReplyBody(body)}
                  onStatusChange={(s) => setStatusChange(s)}
                />
                <Button variant="outline" size="sm" onClick={() => setIsInternal(!isInternal)} className={isInternal ? 'bg-amber-100 dark:bg-amber-950' : ''}>
                  <Lock className="w-3.5 h-3.5" /> {isInternal ? 'Internal note' : 'Public reply'}
                </Button>
              </div>
            )}
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={isInternal ? 'Internal note (only visible to support agents)...' : 'Type your reply...'}
              rows={3}
              className="text-sm"
            />
            <div className="flex justify-end">
              <Button onClick={handleReply} disabled={sending || !replyBody.trim()} size="sm">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isInternal ? 'Add Note' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 shrink-0 border-l border-border overflow-y-auto p-4 space-y-4 hidden lg:block">
          {/* SLA */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> SLA Timer
            </p>
            <div className="rounded-lg border border-border p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs">Resolution</span>
                <Badge variant={sla.breached ? 'destructive' : 'outline'} className="text-xs">
                  {sla.label}
                </Badge>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${sla.breached ? 'bg-red-500' : sla.pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(sla.pct, 100)}%` }}
                />
              </div>
              {ticket.sla_response_deadline && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Response by: {formatDateTime(ticket.sla_response_deadline)}
                </p>
              )}
              {ticket.sla_resolution_deadline && (
                <p className="text-xs text-muted-foreground">
                  Resolution by: {formatDateTime(ticket.sla_resolution_deadline)}
                </p>
              )}
            </div>
          </div>

          {/* Assignment */}
          {isAgent && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <Headphones className="w-3.5 h-3.5" /> Assignment
              </p>
              {ticket.assigned_to_name ? (
                <p className="text-sm">{ticket.assigned_to_name}</p>
              ) : (
                <Button variant="outline" size="sm" onClick={handleAssign} className="w-full">
                  Assign to me
                </Button>
              )}
            </div>
          )}

          {/* Priority (agent editable) */}
          {isAgent && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Priority</p>
              <Select value={priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tags (agent editable) */}
          {isAgent && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Tags
              </p>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {tags.map(t => (
                  <Badge key={t} variant="secondary" className="text-xs cursor-pointer" onClick={() => handleRemoveTag(t)}>
                    {t} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag..."
                  className="flex-1 text-xs rounded border border-border px-2 py-1 bg-background"
                />
                <Button variant="ghost" size="sm" onClick={handleAddTag}>Add</Button>
              </div>
            </div>
          )}

          {/* Submitter info */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Submitter
            </p>
            <div className="text-xs space-y-0.5">
              <p className="font-medium">{ticket.submitted_by_name}</p>
              <p className="text-muted-foreground">{ticket.submitted_by_email}</p>
              <p className="text-muted-foreground">{ticket.submitted_by_role}</p>
            </div>
          </div>

          {/* Auto-captured context */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5" /> Context
            </p>
            <div className="text-xs space-y-0.5 text-muted-foreground">
              <p>Page: <span className="font-mono">{ticket.current_page || 'N/A'}</span></p>
              <p>App version: {ticket.app_version || 'N/A'}</p>
              {ticket.device_info?.browser && <p>Browser: {ticket.device_info.browser} / {ticket.device_info.os}</p>}
              {ticket.device_info?.platform && <p>Device: {ticket.device_info.platform}</p>}
              {ticket.branch_name && <p>Branch: {ticket.branch_name}</p>}
              {ticket.client_errors?.length > 0 && (
                <p className="text-amber-600 dark:text-amber-400">{ticket.client_errors.length} error(s) captured</p>
              )}
            </div>
          </div>

          {/* Tenant context (agents only) */}
          {isAgent && (
            <div>
              <button
                onClick={() => setShowContext(!showContext)}
                className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5" /> Tenant Context {showContext ? '▲' : '▼'}
              </button>
              {showContext && <TenantContextPanel clubId={ticket.club_id} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}