import React, { useEffect, useState } from "react";
import { useNavigate } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard, Send, CheckCircle2, Users, UserCheck, Clock, PartyPopper } from "lucide-react";

const WAVES = [
  { key: "directors", label: "Directors", desc: "Club directors first", role: "club_director" },
  { key: "coaches", label: "Coaches", desc: "Head coaches next", role: "coach" },
  { key: "pilot", label: "Pilot team", desc: "One team's families", role: "parent_guardian" },
  { key: "everyone", label: "Everyone", desc: "All remaining families", role: "parent_guardian" },
];

/** Stage D workspace: payments deferral, invitation waves with message review and acceptance tracking. */
export default function StageDPanel({ clubId, journey, canEdit, onSaved }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null); // { wave, recipients }
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("journey-action", { action: "wave_stats" });
      setStats(data);
    } catch (e) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const gatherRecipients = async (wave) => {
    const role = WAVES.find((w) => w.key === wave).role;
    let recipients = [];
    if (wave === "directors" || wave === "coaches") {
      const users = await base44.entities.User.filter({ club_id: clubId, custom_role: role }).catch(() => []);
      recipients = users.filter((u) => u.email).map((u) => ({ email: u.email, name: u.full_name || u.email, role }));
    } else if (wave === "pilot") {
      // Pick the first team's guardians
      const teams = await base44.entities.Team.filter({ club_id: clubId }, { sort: "-created_date", limit: 1 }).then((r) => r.items || r).catch(() => []);
      if (teams.length === 0) return [];
      const team = teams[0];
      const players = await base44.entities.Player.filter({ club_id: clubId, team_id: team.id }).catch(() => []);
      const guardianIds = [...new Set(players.map((p) => p.guardian_id).filter(Boolean))];
      const guardians = await base44.entities.Guardian.filter({ club_id: clubId, _id: { $in: guardianIds } }).catch(() => []);
      recipients = guardians.filter((g) => g.email).map((g) => ({ email: g.email, name: `${g.first_name} ${g.last_name}`, role: "parent_guardian" }));
    } else {
      // Everyone: all guardians without a user_id
      const guardians = await base44.entities.Guardian.filter({ club_id: clubId }).catch(() => []);
      recipients = guardians.filter((g) => g.email && !g.user_id).map((g) => ({ email: g.email, name: `${g.first_name} ${g.last_name}`, role: "parent_guardian" }));
    }
    return recipients;
  };

  const openReview = async (wave) => {
    setReview({ wave, loading: true });
    const recipients = await gatherRecipients(wave);
    setMessage(`You're invited to join ${journey?.club_name || "our club"} on Club Rudder. Set up your account to see your team schedule, payments and announcements.`);
    setReview({ wave, recipients });
  };

  const send = async () => {
    if (!review) return;
    setSending(true);
    try {
      const { data } = await base44.functions.invoke("journey-action", {
        action: "send_wave",
        wave: review.wave,
        recipients: review.recipients,
        message,
      });
      onSaved?.(data);
      setReview(null);
      await load();
    } catch (e) {
      // non-fatal
    } finally {
      setSending(false);
    }
  };

  const isLive = journey?.club_id && stats?.waves?.directors;

  if (loading) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const s = stats?.stats || { total: 0, pending: 0, accepted: 0 };

  return (
    <div className="mt-2 p-4 rounded-xl border border-border bg-muted/30 space-y-4">
      {/* Payments (deferrable) */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">Connect payments</div>
            <div className="text-xs text-muted-foreground">Families can't pay online until this is done. You can defer and a reminder stays visible.</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/Connections")}>Connect</Button>
        </div>
      </div>

      {/* Acceptance tracking */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Invited" value={s.total} icon={Users} />
        <MiniStat label="Accepted" value={s.accepted} icon={UserCheck} />
        <MiniStat label="Pending" value={s.pending} icon={Clock} />
      </div>

      {/* Invitation waves */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">Invitation waves</div>
        <p className="text-xs text-muted-foreground">Send directors first, then coaches, then a pilot team, then everyone. The first wave makes your club Live.</p>
        {WAVES.map((w) => {
          const waveState = stats?.waves?.[w.key];
          const sent = waveState?.state === "done";
          return (
            <div key={w.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2">
                {sent ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}
                <div>
                  <div className="text-sm font-medium">{w.label}</div>
                  <div className="text-xs text-muted-foreground">{w.desc}{sent ? ` · ${waveState.sent_count} sent` : ""}</div>
                </div>
              </div>
              {canEdit && (
                <Button size="sm" variant={sent ? "outline" : "default"} onClick={() => openReview(w.key)} className="gap-1.5">
                  {sent ? "Resend" : "Review & send"} <Send className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Go-live notice */}
      {isLive && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
          <PartyPopper className="w-4 h-4" /> Your club is Live! The Season Command Center is available from your dashboard.
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={!!review} onOpenChange={(v) => !v && setReview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review and send: {WAVES.find((w) => w.key === review?.wave)?.label}</DialogTitle>
          </DialogHeader>
          {review?.loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Recipients ({review?.recipients?.length || 0})</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {(review?.recipients || []).map((r, i) => (
                      <div key={i} className="text-xs flex justify-between"><span>{r.name}</span><span className="text-muted-foreground">{r.email}</span></div>
                    ))}
                    {(review?.recipients || []).length === 0 && <p className="text-xs text-muted-foreground">No recipients found. Add people first.</p>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Message</div>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReview(null)}>Cancel</Button>
                <Button onClick={send} disabled={sending || !review?.recipients?.length} className="gap-2">
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />} Send to {review?.recipients?.length || 0}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="p-2.5 rounded-lg border border-border bg-card text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}