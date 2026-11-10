import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Ticket, Search, Filter, MessageSquare, Send, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const STATUS_STYLES = {
  open: "bg-rose-100 text-rose-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-500",
};

const PRIORITY_STYLES = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-rose-100 text-rose-700",
};

const CATEGORY_LABELS = {
  billing: "Billing",
  technical: "Technical",
  feature_request: "Feature Request",
  account: "Account",
  other: "Other",
};

export default function SupportTicketsTab({ clubs }) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.SupportTicket.list("-created_date", 500);
      setTickets(rows || []);
    } catch (err) {
      toast({ title: "Failed to load tickets", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = [...tickets];
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all") list = list.filter((t) => t.priority === priorityFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) =>
        t.subject?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.club_name?.toLowerCase().includes(q) ||
        t.submitted_by_email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, search, statusFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    urgent: tickets.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length,
  }), [tickets]);

  const openResolve = (ticket) => {
    setSelectedTicket(ticket);
    setResolveNotes(ticket.resolution_notes || "");
  };

  const handleResolve = async (newStatus) => {
    if (!selectedTicket) return;
    setResolving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.SupportTicket.update(selectedTicket.id, {
        status: newStatus,
        resolution_notes: resolveNotes,
        resolved_by: me?.email || "system",
        resolved_date: new Date().toISOString(),
      });
      toast({ title: `Ticket ${newStatus === "resolved" ? "resolved" : "updated"}` });
      setSelectedTicket(null);
      setResolveNotes("");
      load();
    } catch (err) {
      toast({ title: "Failed to update ticket", description: err?.message, variant: "destructive" });
    } finally {
      setResolving(false);
    }
  };

  const handleStatusChange = async (ticket, status) => {
    try {
      await base44.entities.SupportTicket.update(ticket.id, { status });
      toast({ title: "Status updated" });
      load();
    } catch (err) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Ticket} label="Total" value={stats.total} tone="indigo" />
        <StatCard icon={AlertCircle} label="Open" value={stats.open} tone="rose" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} tone="amber" />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} tone="emerald" />
        <StatCard icon={AlertCircle} label="Urgent" value={stats.urgent} tone="rose" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search subject, description, club, or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              <Ticket className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No support tickets found.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => openResolve(t)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{t.subject}</p>
                      <Badge className={PRIORITY_STYLES[t.priority] || "bg-slate-100"} variant="outline">{t.priority}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="font-medium text-slate-600">{t.club_name || "—"}</span>
                      <span>{CATEGORY_LABELS[t.category] || t.category}</span>
                      <span>{t.submitted_by_email || "—"}</span>
                      <span>{new Date(t.created_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge className={STATUS_STYLES[t.status] || "bg-slate-100"}>{t.status?.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-xs text-slate-400">Club</Label><p className="font-medium">{selectedTicket.club_name || "—"}</p></div>
                <div><Label className="text-xs text-slate-400">Category</Label><p className="font-medium">{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</p></div>
                <div><Label className="text-xs text-slate-400">Submitted By</Label><p className="font-medium">{selectedTicket.submitted_by_name || "—"} ({selectedTicket.submitted_by_email || "—"})</p></div>
                <div><Label className="text-xs text-slate-400">Created</Label><p className="font-medium">{new Date(selectedTicket.created_date).toLocaleString()}</p></div>
              </div>

              <div>
                <Label className="text-xs text-slate-400">Description</Label>
                <div className="mt-1 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm whitespace-pre-wrap">{selectedTicket.description}</div>
              </div>

              <div>
                <Label className="text-xs text-slate-400">Resolution Notes</Label>
                <Textarea
                  rows={4}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Describe the resolution or next steps…"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-400">Quick Status:</Label>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(v) => {
                    setSelectedTicket({ ...selectedTicket, status: v });
                    handleStatusChange(selectedTicket, v);
                  }}
                >
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>Close</Button>
            <Button
              onClick={() => handleResolve("resolved")}
              disabled={resolving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {resolving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    indigo: "bg-indigo-100 text-indigo-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone]}`}><Icon className="w-4.5 h-4.5" /></div>
        <div><div className="text-xl font-extrabold">{value}</div><div className="text-xs text-slate-400">{label}</div></div>
      </CardContent>
    </Card>
  );
}