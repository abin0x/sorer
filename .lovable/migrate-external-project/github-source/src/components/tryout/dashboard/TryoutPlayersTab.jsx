import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Users } from "lucide-react";
import { toast } from "sonner";
import PlayersToolbar from "@/components/tryout/dashboard/PlayersToolbar";
import PlayerTableRow from "@/components/tryout/dashboard/PlayerTableRow";
import PlayerCard from "@/components/tryout/dashboard/PlayerCard";
import RegistrationDetailDialog from "@/components/tryout/RegistrationDetailDialog";
import MovePlayersDialog from "@/components/tryout/dashboard/MovePlayersDialog";
import AutoBibDialog from "@/components/tryout/dashboard/AutoBibDialog";
import RemindDialog from "@/components/tryout/dashboard/RemindDialog";
import NoteDialog from "@/components/tryout/dashboard/NoteDialog";
import AddPlayerDialog from "@/components/tryout/dashboard/AddPlayerDialog";
import { issuesFor, exportRoster, printRoster, printCheckInSheet, sessionOptionLabel } from "@/lib/tryoutDashboard";

/** The master list: everyone in the pool and every registration, with the
 *  paperwork and payment gaps, plus the bulk tools the club runs on. */
export default function TryoutPlayersTab({ clubId, plans, events, registrations, onChanged }) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [sessionId, setSessionId] = useState("all");
  const [issue, setIssue] = useState("all");
  const [selected, setSelected] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [noteFor, setNoteFor] = useState(null);

  const sessions = useMemo(
    () => events.filter((e) => scope === "all" || e.tryout_plan_id === scope).sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [events, scope],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations
      .filter((r) => {
        if (scope === "pool") { if (r.tryout_plan_id && r.status !== "pooled") return false; }
        else if (scope !== "all" && r.tryout_plan_id !== scope) return false;
        if (sessionId !== "all" && r.tryout_event_id !== sessionId) return false;
        if (issue !== "all" && !issuesFor(r).includes(issue)) return false;
        if (!q) return true;
        return [r.player_name, r.guardian_name, r.guardian_email, r.guardian_phone, r.desired_age_group,
          r.bib_number ? String(r.bib_number) : "", r.check_in_code]
          .filter(Boolean).join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => String(a.session_date || "9999").localeCompare(String(b.session_date || "9999"))
        || String(a.player_name).localeCompare(String(b.player_name)));
  }, [registrations, scope, sessionId, issue, search]);

  const selectedRows = rows.filter((r) => selected.includes(r.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r.id));

  const scopeLabel = scope === "all" ? "All tryouts" : scope === "pool" ? "The player pool" : (plans.find((p) => p.id === scope)?.title || "This tryout");
  const sheetTitle = sessionId !== "all"
    ? (sessions.find((e) => e.id === sessionId) ? sessionOptionLabel(sessions.find((e) => e.id === sessionId)) : scopeLabel)
    : scopeLabel;
  const subtitle = `${scopeLabel} · ${rows.length} player${rows.length === 1 ? "" : "s"}`;

  const closeDialog = () => setDialog(null);
  const finish = () => { setDialog(null); setSelected([]); onChanged(); };

  const checkIn = async () => {
    const ids = selectedRows.filter((r) => !r.checked_in).map((r) => r.id);
    if (!ids.length) { toast.info("Everyone selected is already checked in."); return; }
    await base44.entities.TryoutRegistration.bulkUpdate(ids.map((id) => ({
      id, checked_in: true, checked_in_at: new Date().toISOString(), attended: true, status: "checked_in",
    })));
    toast.success(`${ids.length} player${ids.length === 1 ? "" : "s"} checked in`);
    finish();
  };

  const openReg = openId ? registrations.find((r) => r.id === openId) : null;
  const openPlan = openReg ? plans.find((p) => p.id === openReg.tryout_plan_id) : null;

  const counts = {
    unpaid: rows.filter((r) => issuesFor(r).includes("payment")).length,
    paperwork: rows.filter((r) => issuesFor(r).includes("paperwork")).length,
    checkedIn: rows.filter((r) => r.checked_in).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Shown", value: rows.length },
          { label: "Fees due", value: counts.unpaid },
          { label: "Paperwork outstanding", value: counts.paperwork },
          { label: "Checked in", value: counts.checkedIn },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <PlayersToolbar
        search={search} onSearch={setSearch}
        plans={plans} scope={scope} onScope={(v) => { setScope(v); setSessionId("all"); }}
        sessions={sessions} sessionId={sessionId} onSession={setSessionId}
        issue={issue} onIssue={setIssue}
        count={rows.length} selectedCount={selected.length}
        onAdd={() => setDialog("add")}
        onMove={() => setDialog("move")}
        onBibs={() => setDialog("bibs")}
        onRemind={() => setDialog("remind")}
        onCheckIn={checkIn}
        onPrintRoster={() => printRoster({ title: `${sheetTitle} — session roster`, subtitle, rows, includeSignature: true })}
        onPrintSheet={() => printCheckInSheet({ title: `${sheetTitle} — check-in sheet`, subtitle, rows })}
        onExport={() => exportRoster(rows, `${sheetTitle.replace(/[^\w-]+/g, "-").toLowerCase()}-roster.csv`)}
      />

      {rows.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
          <Users className="w-6 h-6" />
          No players match these filters.
        </div>
      ) : (
        <>
          <div className="hidden md:block border border-border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select everyone shown" />
                  </TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Bib</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Paperwork</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Pool</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <PlayerTableRow
                    key={r.id}
                    reg={r}
                    selected={selected.includes(r.id)}
                    onToggle={toggle}
                    onOpen={(reg) => setOpenId(reg.id)}
                    onNote={setNoteFor}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-2">
            {rows.map((r) => (
              <PlayerCard
                key={r.id}
                reg={r}
                selected={selected.includes(r.id)}
                onToggle={toggle}
                onOpen={(reg) => setOpenId(reg.id)}
                onNote={setNoteFor}
              />
            ))}
          </div>
        </>
      )}

      {openReg && (
        <RegistrationDetailDialog
          registration={openReg}
          plan={openPlan}
          events={events.filter((e) => e.tryout_plan_id === openReg.tryout_plan_id)}
          clubId={clubId}
          canManage
          onClose={() => setOpenId(null)}
          onChanged={() => { setOpenId(null); onChanged(); }}
        />
      )}

      {dialog === "move" && <MovePlayersDialog ids={selected} sessions={sessions} onClose={closeDialog} onDone={finish} />}
      {dialog === "bibs" && (
        <AutoBibDialog
          target={selected.length ? { registration_ids: selected } : (sessionId !== "all" ? { event_id: sessionId } : scope !== "all" && scope !== "pool" ? { plan_id: scope } : { club_id: clubId })}
          scopeLabel={selected.length ? `${selected.length} selected player${selected.length === 1 ? "" : "s"}` : sheetTitle}
          onClose={closeDialog}
          onDone={finish}
        />
      )}
      {dialog === "remind" && <RemindDialog regs={selectedRows} onClose={closeDialog} onDone={finish} />}
      {dialog === "add" && (
        <AddPlayerDialog
          clubId={clubId}
          plans={plans}
          events={events}
          defaultPlanId={scope !== "all" && scope !== "pool" ? scope : ""}
          onClose={closeDialog}
          onDone={finish}
        />
      )}
      {noteFor && <NoteDialog reg={noteFor} onClose={() => setNoteFor(null)} onDone={() => { setNoteFor(null); onChanged(); }} />}
    </div>
  );
}