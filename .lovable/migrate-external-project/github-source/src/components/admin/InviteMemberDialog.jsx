import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, Mail, ShieldAlert, Send, Plus, ClipboardPaste, Upload,
  CheckCircle2, XCircle, RefreshCw, Wifi, WifiOff,
} from "lucide-react";
import { ROLES, isSystemUser } from "@/lib/rbac";
import { useTenant } from "@/lib/TenantContext";
import { parseCsvFile } from "@/lib/csvUtils";
import { parsePastedLines, nextRowId, EMAIL_RE } from "@/lib/inviteParsing";
import InviteRow from "@/components/admin/InviteRow";
import { toast } from "sonner";

const SYSTEM_ONLY_ROLES = [ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN];
const INVITABLE_ROLES = [
  ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.BOOKKEEPER, ROLES.PROJECT_MANAGER,
  ROLES.COACH, ROLES.TEAM_MANAGER, ROLES.FACILITY_MANAGER, ROLES.PLATFORM_DIRECTOR,
  ROLES.PARENT_GUARDIAN, ROLES.PLAYER,
];
const CSV_FIELDS = [{ key: "full_name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role" }];

const emptyRow = () => ({ id: nextRowId(), full_name: "", email: "", role: "", status: "idle", error: null });

export default function InviteMemberDialog({ open, onOpenChange, user }) {
  const [rows, setRows] = useState([emptyRow()]);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [sending, setSending] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [resendStatus, setResendStatus] = useState(null); // null = checking

  const systemUser = isSystemUser(user);
  const availableRoles = systemUser ? [...SYSTEM_ONLY_ROLES, ...INVITABLE_ROLES] : INVITABLE_ROLES;

  // The viewed tenant's club id — for a system user this is the tenant they
  // opened, NOT their own home club. Without this the backend falls back to
  // user.club_id and stamps the invite with the wrong club's name.
  const { effectiveClubId } = useTenant();

  // Live check that Resend is actually connected & working — before letting anyone hit Send.
  useEffect(() => {
    if (!open) return;
    setResendStatus(null);
    base44.functions.invoke("checkResendConnection", {})
      .then((res) => setResendStatus(res.data))
      .catch(() => setResendStatus({ connected: false, reason: "error" }));
  }, [open]);

  const reset = () => {
    setRows([emptyRow()]);
    setPasteText("");
    setShowPaste(false);
    setDone(false);
  };

  const updateRow = (updated) => setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  const removeRow = (id) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const applyPaste = () => {
    const parsed = parsePastedLines(pasteText, availableRoles);
    if (parsed.length === 0) {
      toast.error("Nothing to add — paste one invitee per line");
      return;
    }
    setRows((prev) => [...prev.filter((r) => r.email || r.full_name), ...parsed.map((r) => ({ ...r, status: "idle", error: null }))]);
    setPasteText("");
    setShowPaste(false);
  };

  const handleCsvFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCsvBusy(true);
    try {
      const parsed = await parseCsvFile(file, CSV_FIELDS);
      const mapped = parsed
        .filter((p) => p.email)
        .map((p) => ({ id: nextRowId(), full_name: p.full_name || "", email: p.email.toLowerCase(), role: p.role || "", status: "idle", error: null }));
      if (mapped.length === 0) {
        toast.error("No valid rows found in that file");
      } else {
        setRows((prev) => [...prev.filter((r) => r.email || r.full_name), ...mapped]);
        toast.success(`Added ${mapped.length} row(s) from CSV`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to read CSV");
    } finally {
      setCsvBusy(false);
    }
  };

  // Sends the given rows one at a time so the UI can show live per-row progress.
  const sendRows = async (targetRows) => {
    setSending(true);
    let sentCount = 0;
    let failedCount = 0;
    let stoppedEarly = false;

    for (const row of targetRows) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "sending", error: null } : r)));
      try {
        const res = await base44.functions.invoke("inviteClubMember", {
          invitees: [{ email: row.email.trim(), full_name: row.full_name.trim(), role: row.role }],
          club_id: effectiveClubId,
        });
        const result = res.data?.results?.[0];
        if (result?.success) {
          sentCount += 1;
          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "sent" } : r)));
        } else {
          failedCount += 1;
          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "failed", error: result?.error || "Failed to send" } : r)));
        }
      } catch (e) {
        failedCount += 1;
        const msg = e?.response?.data?.error || e?.message || "Failed to send";
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "failed", error: msg } : r)));
        if (e?.response?.data?.preflight_failed) {
          toast.error(msg);
          stoppedEarly = true;
          break;
        }
      }
    }

    setSending(false);
    setDone(true);
    if (!stoppedEarly) {
      if (failedCount === 0) toast.success(`${sentCount} invitation${sentCount !== 1 ? "s" : ""} sent successfully`);
      else toast.warning(`${sentCount} sent, ${failedCount} failed — see details below`);
    }
  };

  const handleSend = async () => {
    const filled = rows.filter((r) => r.email.trim());
    if (filled.length === 0) {
      toast.error("Add at least one invitee");
      return;
    }
    const invalid = filled.find((r) => !EMAIL_RE.test(r.email.trim()) || !r.role);
    if (invalid) {
      toast.error("Every row needs a valid email and a role selected");
      return;
    }
    await sendRows(filled);
  };

  const handleRetryFailed = async () => {
    const failedRows = rows.filter((r) => r.status === "failed");
    if (failedRows.length === 0) return;
    // Re-check the connection before retrying — the whole reason it failed may now be fixed.
    const check = await base44.functions.invoke("checkResendConnection", {}).catch(() => null);
    if (check) setResendStatus(check.data);
    await sendRows(failedRows);
  };

  const filledCount = rows.filter((r) => r.email.trim()).length;
  const sentCount = rows.filter((r) => r.status === "sent").length;
  const failedCount = rows.filter((r) => r.status === "failed").length;
  const resendConnected = resendStatus?.connected === true;
  const resendChecked = resendStatus !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
              <Mail className="w-4.5 h-4.5 text-white" />
            </div>
            Invite Club Members
          </DialogTitle>
          <DialogDescription>
            Invite one or many people at once. Add rows, paste a list, or import a CSV — each needs an email and a role.
          </DialogDescription>
        </DialogHeader>

        {/* Live Resend connection status */}
        {!resendChecked ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking email connection…
          </div>
        ) : resendConnected ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 w-fit">
            <Wifi className="w-3.5 h-3.5" /> Resend connected — ready to send
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1 w-fit">
            <WifiOff className="w-3.5 h-3.5" />
            Email sending isn't connected —{" "}
            <Link to="/Connections" className="underline font-medium hover:text-red-900">
              fix it on Connections
            </Link>
          </div>
        )}

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-[auto_1fr_1.2fr_1fr_auto] gap-2 text-xs font-medium text-slate-500 px-0.5">
            <span></span>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span></span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {rows.map((row) => (
              <InviteRow
                key={row.id}
                row={row}
                availableRoles={availableRoles}
                systemOnlyRoles={SYSTEM_ONLY_ROLES}
                onChange={updateRow}
                onRemove={() => removeRow(row.id)}
              />
            ))}
          </div>

          {!done && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Row
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowPaste((v) => !v)}>
                <ClipboardPaste className="w-3.5 h-3.5 mr-1.5" /> Paste Multiple
              </Button>
              <label className="inline-flex">
                <Button variant="outline" size="sm" disabled={csvBusy} asChild>
                  <span className="cursor-pointer">
                    {csvBusy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                    Import CSV
                  </span>
                </Button>
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCsvFile} disabled={csvBusy} />
              </label>
            </div>
          )}

          {showPaste && !done && (
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                One per line — any order of name, email, role (comma or tab separated). Example:{" "}
                <code className="bg-slate-100 px-1 rounded">Jane Doe, jane@example.com, Coach</code>
              </p>
              <Textarea rows={4} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"Jane Doe, jane@example.com, Coach\njohn@example.com, Bookkeeper"} />
              <Button size="sm" onClick={applyPaste} className="bg-emerald-600 hover:bg-emerald-700">Add to List</Button>
            </div>
          )}

          {!systemUser && !done && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Club Admin and Club Director invitations can only be sent by a system user. Contact platform support to invite users to those roles.
              </p>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-4 text-sm px-1 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4" /> {sentCount} sent
              </span>
              {failedCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                  <XCircle className="w-4 h-4" /> {failedCount} failed
                </span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!done ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending || !resendChecked || !resendConnected} className="bg-emerald-600 hover:bg-emerald-700">
                {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                {sending ? "Sending…" : `Send Invitation${filledCount > 1 ? "s" : ""}`}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {failedCount > 0 && (
                <Button onClick={handleRetryFailed} disabled={sending} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                  Retry Failed ({failedCount})
                </Button>
              )}
              <Button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1.5" /> Invite More
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}