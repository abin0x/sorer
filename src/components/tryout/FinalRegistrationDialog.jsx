import { emailFinalInvite } from '@/lib/tryoutDay';
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { teamsBlockingFinalInvites } from "@/lib/seasonReadiness";

const DEFAULT_SUBJECT = "Your {{team_name}} Registration — Complete Your Spot";
const DEFAULT_BODY =
  "Hi {{guardian_name}},\n\n" +
  "Congratulations — {{player_name}} has been selected for {{team_name}}!\n\n" +
  "Please complete final registration by signing the waiver and choosing your payment plan here:\n{{portal_link}}\n\n" +
  "We look forward to a great season.\n\nThanks!";

/**
 * One-click final registration: club admin reviews/edits the invite email
 * template, then it's sent to every rostered player's guardian with a link
 * to the public Final Registration portal (waiver + payment plan).
 */
export default function FinalRegistrationDialog({ plan, teams, onClose }) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [sending, setSending] = useState(false);

  const { data: template } = useQuery({
    queryKey: ["finalRegTemplate"],
    queryFn: () => base44.entities.EmailTemplate.filter({ template_type: "tryout_final_registration", is_active: true }).then((r) => r[0] || null),
    enabled: !!plan,
  });

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  }, [template]);

  const teamIds = (teams || []).map((t) => t.id);
  const { data: rosteredPlayers = [], isLoading } = useQuery({
    queryKey: ["rosteredPlayersForFinalReg", teamIds.join(",")],
    queryFn: () => Promise.all(teamIds.map((id) => base44.entities.Player.filter({ team_id: id }, null, 200))).then((r) => r.flat()),
    enabled: !!plan && teamIds.length > 0,
  });

  const { data: existingInvites = [] } = useQuery({
    queryKey: ["finalRegInvitesForPlan", plan?.id],
    queryFn: () => base44.entities.TryoutFinalRegistration.filter({ tryout_plan_id: plan.id }, null, 500),
    enabled: !!plan,
  });
  const invitedPlayerIds = new Set(existingInvites.map((i) => i.player_id));
  const pending = rosteredPlayers.filter((p) => !invitedPlayerIds.has(p.id) && p.guardian_id);

  const { data: teamPlans = [] } = useQuery({
    queryKey: ["finalRegTeamPlans"],
    queryFn: () => base44.entities.TeamPlan.list("-created_date", 500),
    enabled: !!plan,
  });

  // Hard gate: every rostered team with pending players must have an active
  // team plan before final registration invites can go out.
  const blockingTeams = teamsBlockingFinalInvites(pending, teams || [], teamPlans);

  if (!plan) return null;

  const handleSend = async () => {
    if (pending.length === 0 || blockingTeams.length > 0) return;
    setSending(true);
    let sent = 0;
    const failed = [];
    try {
      // Save/update the club's editable template so future sends reuse the edited wording
      if (template) {
        await base44.entities.EmailTemplate.update(template.id, { subject, body });
      } else {
        await base44.entities.EmailTemplate.create({ template_type: "tryout_final_registration", subject, body });
      }

      for (const player of pending) {
        const guardian = await base44.entities.Guardian.get(player.guardian_id).catch(() => null);
        if (!guardian?.email) continue;
        const team = teams.find((t) => t.id === player.team_id);

        const invite = await base44.entities.TryoutFinalRegistration.create({
          tryout_plan_id: plan.id,
          player_id: player.id,
          player_name: `${player.first_name} ${player.last_name}`,
          team_id: player.team_id,
          team_name: player.team_name,
          guardian_id: guardian.id,
          guardian_email: guardian.email,
          amount_due: team?.cost || 0,
          status: "invited",
          invited_date: new Date().toISOString(),
        });

        try {
          await emailFinalInvite(invite, { subject, body, guardianName: guardian.first_name });
          sent++;
        } catch {
          // Remove the invite so this family shows up again for a retry.
          await base44.entities.TryoutFinalRegistration.delete(invite.id).catch(() => null);
          failed.push(invite.player_name);
        }
      }
      if (failed.length) {
        toast.error(`Sent ${sent}; couldn't email ${failed.join(", ")}. Check the club's email connection and send again.`);
      } else {
        toast.success(`Sent ${sent} final registration invite${sent === 1 ? "" : "s"}`);
        onClose(true);
      }
    } catch (e) {
      toast.error("Some invites failed to send. Please try again.");
    }
    setSending(false);
  };

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="w-4 h-4" /> Send Final Registration Invites</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading rostered players…" : `${pending.length} rostered player${pending.length === 1 ? "" : "s"} ready to invite (${existingInvites.length} already invited).`}
          </p>

          {blockingTeams.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Sending is blocked — {blockingTeams.map((t) => t.name).join(", ")} {blockingTeams.length === 1 ? "has" : "have"} no active team plan.
                Assign and activate a plan for {blockingTeams.length === 1 ? "this team" : "these teams"} first.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Email subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} />
            <p className="text-xs text-muted-foreground">
              Placeholders: {"{{guardian_name}}"}, {"{{player_name}}"}, {"{{team_name}}"}, {"{{portal_link}}"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || pending.length === 0 || blockingTeams.length > 0}>
            {sending ? "Sending…" : `Send ${pending.length} Invite${pending.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}