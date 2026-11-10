import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, MoveRight, Hash, MailCheck, UserCheck, Printer, FileDown, ClipboardList } from "lucide-react";
import { ISSUE_FILTERS, sessionOptionLabel } from "@/lib/tryoutDashboard";

/** Search, scope and the bulk actions for the pool/registration table. */
export default function PlayersToolbar({
  search, onSearch, plans, scope, onScope, sessions, sessionId, onSession,
  issue, onIssue, count, selectedCount, onAdd, onMove, onBibs, onRemind, onCheckIn,
  onPrintRoster, onPrintSheet, onExport,
}) {
  const hasSelection = selectedCount > 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, parent, email, bib number or code…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <Select value={scope} onValueChange={onScope}>
          <SelectTrigger className="lg:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tryouts</SelectItem>
            <SelectItem value="pool">The player pool</SelectItem>
            {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sessionId} onValueChange={onSession}>
          <SelectTrigger className="lg:w-64"><SelectValue placeholder="All sessions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sessions</SelectItem>
            {sessions.map((e) => <SelectItem key={e.id} value={e.id}>{sessionOptionLabel(e)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={issue} onValueChange={onIssue}>
          <SelectTrigger className="lg:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ISSUE_FILTERS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {count} player{count === 1 ? "" : "s"}{hasSelection ? ` · ${selectedCount} selected` : ""}
        </span>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button size="sm" onClick={onAdd} className="gap-1.5"><UserPlus className="w-4 h-4" /> Register a player</Button>
          <Button size="sm" variant="outline" disabled={!hasSelection} onClick={onMove} className="gap-1.5"><MoveRight className="w-4 h-4" /> Move session</Button>
          <Button size="sm" variant="outline" onClick={onBibs} className="gap-1.5"><Hash className="w-4 h-4" /> Auto bibs</Button>
          <Button size="sm" variant="outline" disabled={!hasSelection} onClick={onRemind} className="gap-1.5"><MailCheck className="w-4 h-4" /> Remind families</Button>
          <Button size="sm" variant="outline" disabled={!hasSelection} onClick={onCheckIn} className="gap-1.5"><UserCheck className="w-4 h-4" /> Check in</Button>
          <Button size="sm" variant="outline" onClick={onPrintRoster} className="gap-1.5"><Printer className="w-4 h-4" /> Roster</Button>
          <Button size="sm" variant="outline" onClick={onPrintSheet} className="gap-1.5"><ClipboardList className="w-4 h-4" /> Check-in sheet</Button>
          <Button size="sm" variant="ghost" onClick={onExport} className="gap-1.5"><FileDown className="w-4 h-4" /> CSV</Button>
        </div>
      </div>
    </div>
  );
}