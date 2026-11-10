import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Check, X, Mail, Send, Clock, UserPlus, Copy, RefreshCw, Edit3, Save, Eye, ChevronDown, ExternalLink, PlayCircle, MailOpen, PartyPopper, BellRing, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format } from "date-fns";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

const STATUS_META = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  invited: { label: "Invited", color: "bg-blue-100 text-blue-700", icon: Send },
  opened: { label: "Opened", color: "bg-purple-100 text-purple-700", icon: MailOpen },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: Check },
  trial_in_progress: { label: "Trial In Progress", color: "bg-green-100 text-green-700", icon: PlayCircle },
  denied: { label: "Denied", color: "bg-red-100 text-red-600", icon: X },
};

function timeAgo(dateStr) {
  if (!dateStr) return null;
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return null;
  }
}

export default function DemoAccessTab() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", clubName: "", sport: "Soccer" });
  const [inviting, setInviting] = useState(false);
  const [acting, setActing] = useState(null);
  const [template, setTemplate] = useState(null);
  const [tmplLoading, setTmplLoading] = useState(true);
  const [tmplSaving, setTmplSaving] = useState(false);
  const [tmplForm, setTmplForm] = useState({ subject: "", body: "" });
  const [tmplEditMode, setTmplEditMode] = useState(false);
  const [reminding, setReminding] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteInviteTarget, setDeleteInviteTarget] = useState(null);
  const [deletingInvite, setDeletingInvite] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await base44.functions.invoke("list-demo-access-requests", {});
      setRequests(res.data?.requests || []);
    } catch (err) {
      console.error("DemoAccessRequest load error:", err);
      setLoadError(err?.response?.data?.error || err?.message || "Failed to load demo access requests.");
    } finally {
      setLoading(false);
    }
  };

  const DEFAULT_TMPL_SUBJECT = "{{inviter_name}} invited you to try the Club Rudder demo";
  const DEFAULT_TMPL_BODY = `<p>Hi {{name}},</p>
<p>{{inviter_name}} has invited you to try the Club Rudder interactive demo.</p>
<p>Club Rudder is the all-in-one platform for multi-branch club management — scheduling, payments, communications, rosters, and more, all in one place.</p>
<p style="margin:24px 0;">
  <a href="{{demo_link}}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Launch Interactive Demo</a>
</p>
<p>The demo walks you through setting up a club, adding branches, selecting competitive platforms, and rolling over your first season — with real data saved to a trial account.</p>
<p>— The Club Rudder Team</p>`;

  const loadTemplate = async () => {
    setTmplLoading(true);
    try {
      const rows = await base44.entities.EmailTemplate.filter({ template_type: "demo_access_invite", is_active: true });
      const tmpl = rows?.[0] || null;
      setTemplate(tmpl);
      setTmplForm({
        subject: tmpl?.subject || DEFAULT_TMPL_SUBJECT,
        body: tmpl?.body || DEFAULT_TMPL_BODY,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setTmplLoading(false);
    }
  };

  const saveTemplate = async () => {
    setTmplSaving(true);
    try {
      if (template?.id) {
        await base44.entities.EmailTemplate.update(template.id, { subject: tmplForm.subject, body: tmplForm.body });
      } else {
        const created = await base44.entities.EmailTemplate.create({ template_type: "demo_access_invite", subject: tmplForm.subject, body: tmplForm.body, is_active: true });
        setTemplate(created);
      }
      toast({ title: "Template saved", description: "The invite email template has been updated." });
      setTmplEditMode(false);
      loadTemplate();
    } catch (err) {
      toast({ title: "Save failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setTmplSaving(false);
    }
  };

  useEffect(() => { load(); loadTemplate(); }, []);

  const approve = async (id) => {
    setActing(id);
    try {
      const res = await base44.functions.invoke("review-demo-access", { requestId: id, action: "approve" });
      if (res.data?.emailSent === false) {
        toast({ title: "Approved, but email failed", description: res.data?.emailError || "Access was granted but the email could not be sent. Use 'Copy demo link' to share it manually.", variant: "destructive" });
      } else {
        toast({ title: "Approved", description: "Demo access granted and invite email sent." });
      }
      load();
    } catch (err) {
      toast({ title: "Failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const deny = async (id) => {
    setActing(id);
    try {
      await base44.functions.invoke("review-demo-access", { requestId: id, action: "deny" });
      toast({ title: "Denied", description: "Demo access request rejected." });
      load();
    } catch (err) {
      toast({ title: "Failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;
    setInviting(true);
    try {
      const res = await base44.functions.invoke("invite-demo-access", {
        email: inviteForm.email.trim(),
        name: inviteForm.name.trim(),
        clubName: inviteForm.clubName.trim(),
        sport: inviteForm.sport,
      });
      if (res.data?.emailSent === false) {
        toast({ title: "Invite saved, but email failed", description: res.data?.emailError || "The demo link was created but the email could not be sent. Use 'Copy demo link' to share it manually.", variant: "destructive" });
      } else {
        toast({ title: "Invitation sent", description: `Demo access invite emailed to ${inviteForm.email}` });
      }
      setInviteForm({ email: "", name: "", clubName: "", sport: "Soccer" });
      load();
    } catch (err) {
      toast({ title: "Failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const copyLink = (token) => {
    const link = `https://www.clubrudder.com/demo?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Demo access link copied to clipboard." });
  };

  const sendReminder = async (id) => {
    setReminding(id);
    try {
      const res = await base44.functions.invoke("send-demo-reminder", { requestId: id });
      if (res.data?.emailSent === false) {
        toast({ title: "Reminder failed", description: res.data?.emailError || "The reminder email could not be sent.", variant: "destructive" });
      } else {
        toast({ title: "Reminder sent", description: "A reminder email has been sent to the invitee." });
      }
      load();
    } catch (err) {
      toast({ title: "Failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setReminding(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await base44.functions.invoke("delete-demo-club", { requestId: deleteTarget.id });
      if (res.data?.errors?.length > 0) {
        toast({ title: "Deleted with warnings", description: `Club data removed, but some errors occurred: ${res.data.errors.join("; ")}`, variant: "destructive" });
      } else {
        toast({ title: "Club deleted", description: "The trial club and all associated data have been removed." });
      }
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast({ title: "Delete failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteInvite = async () => {
    if (!deleteInviteTarget) return;
    setDeletingInvite(true);
    try {
      const res = await base44.functions.invoke("delete-demo-invite", { requestId: deleteInviteTarget.id });
      if (res.data?.errors?.length > 0) {
        toast({ title: "Deleted with warnings", description: `Invite removed, but some errors occurred: ${res.data.errors.join("; ")}`, variant: "destructive" });
      } else {
        toast({ title: "Invite deleted", description: "The invitation and all associated club data have been removed." });
      }
      setDeleteInviteTarget(null);
      load();
    } catch (err) {
      toast({ title: "Delete failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setDeletingInvite(false);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const invitations = requests.filter((r) => r.source === "invite" || ["invited", "opened", "trial_in_progress"].includes(r.status));
  const denied = requests.filter((r) => r.status === "denied");

  // Build a rendered preview of the email template with sample data
  const previewHtml = useMemo(() => {
    return (tmplForm.body || "")
      .replace(/\{\{name\}\}/g, "Jane Director")
      .replace(/\{\{inviter_name\}\}/g, "Club Rudder Admin")
      .replace(/\{\{club_name\}\}/g, "Riverside SC")
      .replace(/\{\{demo_link\}\}/g, "#");
  }, [tmplForm.body]);

  const previewSubject = useMemo(() => {
    return (tmplForm.subject || "")
      .replace(/\{\{name\}\}/g, "Jane Director")
      .replace(/\{\{inviter_name\}\}/g, "Club Rudder Admin")
      .replace(/\{\{club_name\}\}/g, "Riverside SC")
      .replace(/\{\{demo_link\}\}/g, "#");
  }, [tmplForm.subject]);

  return (
    <div className="space-y-6">
      {/* Load error banner */}
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-sm">Couldn't load demo access requests</p>
            <p className="text-red-600 text-xs mt-0.5">{loadError}</p>
          </div>
          <Button size="sm" variant="outline" onClick={load} className="text-xs shrink-0">Retry</Button>
        </div>
      )}

      {/* Invite someone directly */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" style={{ color: p() }} />Invite Someone to Try the Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendInvite} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="director@club.com" required />
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Jane Director" />
            </div>
            <div>
              <Label className="text-xs">Club Name</Label>
              <Input value={inviteForm.clubName} onChange={(e) => setInviteForm({ ...inviteForm, clubName: e.target.value })} placeholder="Riverside SC" />
            </div>
            <Button type="submit" disabled={inviting} className="text-white" style={{ background: p() }}>
              {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}Send Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Editable invite email template — accordion with rendered preview */}
      <Accordion type="single" collapsible className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <AccordionItem value="template" className="border-0">
          <AccordionTrigger className="hover:bg-slate-50 px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2 w-full">
              <Edit3 className="w-4 h-4" style={{ color: p() }} />
              <span className="font-semibold text-slate-900">Invite Email Template</span>
              <ChevronDown className="w-4 h-4 ml-auto text-slate-400" />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
            {tmplLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: p() }} /></div>
            ) : tmplEditMode ? (
              <>
                <div>
                  <Label className="text-xs mb-1.5 block">Subject</Label>
                  <Input value={tmplForm.subject} onChange={(e) => setTmplForm({ ...tmplForm, subject: e.target.value })} placeholder="Email subject line" />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Body (HTML)</Label>
                  <Textarea value={tmplForm.body} onChange={(e) => setTmplForm({ ...tmplForm, body: e.target.value })} rows={10} className="font-mono text-xs" placeholder="Email body — use {{name}}, {{inviter_name}}, {{club_name}}, {{demo_link}}" />
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                  <strong>Placeholders:</strong> {"{{name}}"} = recipient name · {"{{inviter_name}}"} = your name · {"{{club_name}}"} = club name · {"{{demo_link}}"} = demo access link
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveTemplate} disabled={tmplSaving} className="text-white" style={{ background: p() }}>
                    {tmplSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}Save Template
                  </Button>
                  <Button variant="outline" onClick={() => { setTmplEditMode(false); loadTemplate(); }}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Rendered email preview — as the customer sees it */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
                    <div className="text-xs text-slate-500 mb-0.5">From: Club Rudder Team</div>
                    <div className="text-xs text-slate-500 mb-0.5">To: Jane Director</div>
                    <div className="text-sm font-semibold text-slate-800">Subject: {previewSubject}</div>
                  </div>
                  <div
                    className="px-5 py-4 text-sm text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setTmplEditMode(true)}>
                  <Edit3 className="w-3.5 h-3.5 mr-1" />Edit Template
                </Button>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Invitations — lifecycle tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" style={{ color: p() }} />
            Invitations ({invitations.length})
            <Button size="sm" variant="ghost" onClick={load} className="ml-auto h-7 text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: p() }} /></div>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No invitations sent yet. Use the form above to invite someone.</p>
          ) : (
            <div className="space-y-3">
              {invitations.map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.invited;
                const StatusIcon = meta.icon;
                return (
                  <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{r.name || r.email}</span>
                          {r.name && <span className="text-slate-400 text-sm">· {r.email}</span>}
                        </div>
                        {r.club_name && <div className="text-sm text-slate-500 mt-0.5">{r.club_name} · {r.sport}</div>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={meta.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {meta.label}
                          </Badge>
                        </div>
                        {/* Lifecycle timeline with actual dates */}
                        <div className="flex flex-col gap-1.5 mt-3 text-xs text-slate-500">
                          {r.invite_sent_date && (
                            <span className="flex items-center gap-1.5">
                              <Send className="w-3 h-3 text-blue-500 shrink-0" />
                              <span><strong className="text-slate-700">Invited:</strong> {format(new Date(r.invite_sent_date), "MMM d, yyyy 'at' h:mm a")}</span>
                              <span className="text-slate-400">({timeAgo(r.invite_sent_date)})</span>
                            </span>
                          )}
                          {r.invite_opened_date && (
                            <span className="flex items-center gap-1.5">
                              <MailOpen className="w-3 h-3 text-purple-500 shrink-0" />
                              <span><strong className="text-slate-700">Opened:</strong> {format(new Date(r.invite_opened_date), "MMM d, yyyy 'at' h:mm a")}</span>
                              <span className="text-slate-400">({timeAgo(r.invite_opened_date)})</span>
                            </span>
                          )}
                          {r.trial_started_date && (
                            <span className="flex items-center gap-1.5">
                              <PartyPopper className="w-3 h-3 text-green-600 shrink-0" />
                              <span><strong className="text-slate-700">Trial started:</strong> {format(new Date(r.trial_started_date), "MMM d, yyyy 'at' h:mm a")}</span>
                              <span className="text-slate-400">({timeAgo(r.trial_started_date)})</span>
                            </span>
                          )}
                          {r.trial_club_name && (
                            <span className="flex items-center gap-1.5 text-green-700 font-medium">
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              {r.trial_club_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {r.access_token && (
                          <Button size="sm" variant="ghost" onClick={() => copyLink(r.access_token)} className="text-xs">
                            <Copy className="w-3 h-3 mr-1" />Copy link
                          </Button>
                        )}
                        {r.access_token && r.status !== "trial_in_progress" && (
                          <Button size="sm" variant="ghost" onClick={() => sendReminder(r.id)} disabled={reminding === r.id} className="text-xs">
                            {reminding === r.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <BellRing className="w-3 h-3 mr-1" />}Send Reminder
                          </Button>
                        )}
                        {r.status === "trial_in_progress" && r.trial_club_id && (
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)} className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-3 h-3 mr-1" />Delete Club/Data
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setDeleteInviteTarget(r)} className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                          <UserX className="w-3 h-3 mr-1" />Delete Invite
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete club confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete trial club and all data?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This will permanently delete <strong>{deleteTarget.trial_club_name || "the trial club"}</strong> and all
                  associated data (branches, teams, players, seasons, tryout plans, payments, etc.) for{" "}
                  <strong>{deleteTarget.email}</strong>. The invitation will be reset to "Opened" so they can start a
                  fresh trial. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete invite confirmation dialog */}
      <AlertDialog open={!!deleteInviteTarget} onOpenChange={(open) => !open && setDeleteInviteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invitation entirely?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteInviteTarget && (
                <>
                  This will permanently delete the invitation for <strong>{deleteInviteTarget.email}</strong>
                  {deleteInviteTarget.trial_club_name && (
                    <> and the trial club <strong>{deleteInviteTarget.trial_club_name}</strong> with all its data</>
                  )}
                  . The invitee will no longer appear in any list. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingInvite}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteInvite}
              disabled={deletingInvite}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletingInvite ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserX className="w-4 h-4 mr-1" />}
              Delete Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pending requests (from public form) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Requests {pending.length > 0 && <Badge className="bg-amber-100 text-amber-700">{pending.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">{r.name} <span className="text-slate-400 font-normal">· {r.email}</span></div>
                    <div className="text-sm text-slate-500">
                      {r.club_name} · {r.sport} · {r.branch_count} branches
                    </div>
                    {r.message && <div className="text-xs text-slate-400 mt-1 italic">"{r.message}"</div>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => approve(r.id)} disabled={acting === r.id} className="text-white" style={{ background: p() }}>
                      {acting === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Approve</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deny(r.id)} disabled={acting === r.id}>
                      <X className="w-3.5 h-3.5 mr-1" />Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Denied requests */}
      {denied.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><X className="w-4 h-4 text-red-500" />Denied ({denied.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {denied.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 opacity-60">
                  <div>
                    <div className="font-semibold text-slate-700 text-sm">{r.name || r.email}</div>
                    <div className="text-xs text-slate-500">{r.email}</div>
                  </div>
                  <Badge variant="outline" className="text-red-500 border-red-200">Denied</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}