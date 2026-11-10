import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { redact, fingerprint, escalateToTickets, SEVERITY_LABELS } from '../../shared/issueMonitor.ts';

// Issue ingest + dedupe engine. Called by signal sources (Stripe webhook,
// QuickBooks sync, email send, migration runner, scheduled jobs, client
// error capture, push notifications) to record a signal. Dedupes by
// fingerprint + club_id: an existing open Issue is updated (count++, last_seen),
// a new one is created. P1/P2 issues escalate to a support ticket per affected
// club and alert the system owner.
//
// Payload:
//   signal_type, severity, title, description, club_id?, club_name?,
//   key? (sub-key for dedupe, e.g. the failing endpoint), context? (raw, redacted),
//   affected_club_ids? (for platform-wide issues), alert_owner? (default true for P1/P2)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      signal_type, severity = "P3", title, description = "",
      club_id = "", club_name = "", key = "", context = {},
      affected_club_ids = [], alert_owner = null,
    } = body;

    if (!signal_type || !title) {
      return Response.json({ error: "signal_type and title are required" }, { status: 400 });
    }

    const fp = await fingerprint([signal_type, club_id || "platform", key || title]);
    const now = new Date().toISOString();
    const sev = ["P1", "P2", "P3", "P4"].includes(severity) ? severity : "P3";
    const cleanContext = redact(context);

    // Dedupe: find an existing open issue with this fingerprint+club
    const existing = await base44.asServiceRole.entities.Issue.filter(
      { fingerprint: fp, status: { $in: ["new", "investigating", "mitigated"] } },
      null, 5
    );
    let issue;
    let created = false;

    if (existing.length) {
      issue = await base44.asServiceRole.entities.Issue.update(existing[0].id, {
        last_seen: now,
        count: (existing[0].count || 1) + 1,
        severity: sev, // upgrade severity if it rose
        error_context: { ...existing[0].error_context, ...cleanContext },
        description: description || existing[0].description,
      });
    } else {
      issue = await base44.asServiceRole.entities.Issue.create({
        fingerprint: fp,
        club_id, club_name,
        signal_type,
        severity: sev,
        status: "new",
        title,
        description,
        first_seen: now,
        last_seen: now,
        count: 1,
        error_context: cleanContext,
        linked_ticket_ids: [],
        metadata: body.metadata || {},
      });
      created = true;
    }

    // Escalate P1/P2: create a ticket per affected club + alert owner
    let escalated = false;
    const shouldEscalate = sev === "P1" || sev === "P2";
    if (shouldEscalate) {
      const clubIds = affected_club_ids.length ? affected_club_ids : (club_id ? [club_id] : []);
      const ticketIds = await escalateToTickets(base44.asServiceRole, issue, clubIds);
      if (ticketIds.length && !issue.linked_ticket_ids?.length) {
        issue = await base44.asServiceRole.entities.Issue.update(issue.id, { linked_ticket_ids: ticketIds });
      }
      escalated = !!ticketIds.length;

      // Alert the system owner by email
      if (alert_owner !== false) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: "tim.salmo@gmail.com",
            subject: `[${sev}] ${title}`,
            body: `A ${SEVERITY_LABELS[sev]} issue was detected by automated monitoring.\n\nIssue: ${title}\nSignal: ${signal_type}\nClub: ${club_name || club_id || "platform-wide"}\nSeverity: ${sev}\nDetails: ${description}\nFirst seen: ${issue.first_seen}\nCount: ${issue.count}\n\n${escalated ? "A support ticket was created for each affected club." : "No club-specific ticket was created."}\n\nReview it in the System Health dashboard.`,
          });
        } catch (e) { /* email failure should not fail ingest */ }
      }
    }

    return Response.json({ status: "ok", issue_id: issue.id, fingerprint: fp, created, escalated, severity: sev });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}