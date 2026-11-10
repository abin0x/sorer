import { base44 } from "@/api/base44Client";

// Best-effort: creates in-app notifications (always) and sends summary emails (best-effort)
// to the coaches and guardians linked to the teams involved in a booking.
export async function notifyBookingRecipients({ event, teams, players, guardians, coaches }) {
  const teamIds = event.team_ids || [];
  const involvedTeams = teams.filter((t) => teamIds.includes(t.id));
  const coachIds = [...new Set(involvedTeams.flatMap((t) => (t.coach_ids?.length ? t.coach_ids : (t.coach_id ? [t.coach_id] : []))))];
  const involvedCoaches = coaches.filter((c) => coachIds.includes(c.id));

  const involvedPlayers = players.filter((p) => teamIds.includes(p.team_id));
  const guardianIds = [...new Set(involvedPlayers.flatMap((p) => (p.guardian_ids?.length ? p.guardian_ids : (p.guardian_id ? [p.guardian_id] : []))))];
  const involvedGuardians = guardians.filter((g) => guardianIds.includes(g.id));

  const recipients = [
    ...involvedCoaches.map((c) => ({ email: c.email, name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Coach" })),
    ...involvedGuardians.map((g) => ({ email: g.email, name: `${g.first_name || ""} ${g.last_name || ""}`.trim() || "Parent" })),
  ].filter((r) => r.email);

  const title = event.team_names?.filter(Boolean).join(" vs ") || event.title;
  const when = new Date(event.start_datetime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  if (recipients.length) {
    try {
      await base44.entities.Notification.bulkCreate(
        recipients.map((r) => ({
          user_email: r.email,
          type: "announcement",
          title: `New schedule: ${title}`,
          message: `${event.event_type === "game" ? "Game" : "Session"} at ${event.field_name || "TBD"} on ${when}.`,
        }))
      );
    } catch { /* non-blocking */ }

    await Promise.all(
      recipients.slice(0, 60).map((r) =>
        base44.integrations.Core.SendEmail({
          to: r.email,
          subject: `New schedule: ${title}`,
          body: `Hi ${r.name},<br/><br/>A new ${event.event_type === "game" ? "game" : "training session"} has been scheduled:<br/><b>${title}</b><br/>${when}<br/>Field: ${event.field_name || "TBD"}<br/><br/>This has been added to the team calendar.`,
        }).catch(() => null)
      )
    );
  }

  return { recipientCount: recipients.length };
}