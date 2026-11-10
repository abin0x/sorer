// Shared helpers for the issue-monitoring system: redaction, fingerprinting,
// ticket escalation, and resolution posting. Used by issue-ingest and
// issue-manage so the logic lives in one place.

const SENSITIVE_KEYS = [
  "password", "token", "secret", "apikey", "api_key", "authorization",
  "stripe_key", "access_token", "refresh_token", "client_secret",
  "card", "cardnumber", "card_number", "cvc", "cvv", "ssn", "iban",
];

const PII_PATTERNS = [
  { re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, repl: "[CARD]" },
  { re: /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, repl: "[SSN]" },
  { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, repl: "[EMAIL]" },
  { re: /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, repl: "[PHONE]" },
  { re: /sk_(live|test)_[A-Za-z0-9]{10,}/g, repl: "[STRIPE_KEY]" },
  { re: /Bearer\s+[A-Za-z0-9._-]+/gi, repl: "Bearer [TOKEN]" },
];

// Recursively strip tokens, card data and PII from any error context.
export function redact(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    let s = value;
    for (const p of PII_PATTERNS) s = s.replace(p.re, p.repl);
    return s.slice(0, 4000);
  }
  if (Array.isArray(value)) return value.slice(0, 50).map(redact);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const lk = k.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lk.includes(s))) { out[k] = "[REDACTED]"; continue; }
      out[k] = redact(v);
    }
    return out;
  }
  return value;
}

// Stable fingerprint from signal_type + club_id + a key string.
export async function fingerprint(parts) {
  const joined = parts.filter(Boolean).join("||");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(joined));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export const SEVERITY_LABELS = { P1: "Critical", P2: "High", P3: "Medium", P4: "Low" };

// Create one support ticket per affected club for a P1/P2 issue, link them,
// and return the ticket IDs. Uses the service-role client so it can create
// tickets across clubs. Idempotent: skips clubs that already have a link.
export async function escalateToTickets(base44, issue, clubIds) {
  const ids = Array.from(new Set(clubIds.filter(Boolean)));
  if (!ids.length) return [];

  // Already-linked tickets for this issue
  const existing = await base44.entities.TicketIssueLink.filter({ issue_id: issue.id }, null, 100);
  const linkedClubIds = new Set(existing.map((l) => l.club_id));
  const toCreate = ids.filter((id) => !linkedClubIds.has(id));
  if (!toCreate.length) return existing.map((l) => l.ticket_id);

  // Resolve club names + admin emails in one pass (tolerate invalid IDs)
  let clubs = [];
  try { clubs = await base44.entities.Club.filter({ id: { $in: toCreate } }, null, 100); } catch (e) { clubs = []; }
  const clubById = Object.fromEntries(clubs.map((c) => [c.id, c]));

  const newLinks = [];
  for (const clubId of toCreate) {
    const club = clubById[clubId] || { name: "Unknown club" };
    const subject = `[${issue.severity}] ${issue.title}`;
    const description = `An issue affecting your club has been detected by automated monitoring and escalated to support.\n\nIssue: ${issue.title}\nSeverity: ${issue.severity} (${SEVERITY_LABELS[issue.severity] || ""})\nSignal: ${issue.signal_type}\nDetails: ${issue.description || "(none)"}\n\nOur team is investigating. This ticket will be updated as we work on it.`;
    try {
      const ticket = await base44.entities.Ticket.create({
        club_id: clubId,
        club_name: club.name,
        category: "technical",
        subject,
        description,
        urgency: issue.severity,
        priority: issue.severity,
        status: "new",
        submitted_by_name: "System Monitoring",
        submitted_by_email: "system@clubrudder.com",
        submitted_by_role: "system_support",
        tags: [`issue:${issue.fingerprint}`, "auto_escalated"],
      });
      await base44.entities.TicketMessage.create({
        club_id: clubId,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        author_name: "System Monitoring",
        author_type: "system",
        message_type: "system_note",
        body: description,
      });
      newLinks.push({
        issue_id: issue.id,
        issue_fingerprint: issue.fingerprint,
        issue_title: issue.title,
        club_id: clubId,
        club_name: club.name,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        ticket_subject: subject,
        ticket_status: "new",
      });
    } catch (e) {
      // one club failing should not block the rest
    }
  }

  if (newLinks.length) await base44.entities.TicketIssueLink.bulkCreate(newLinks);
  return [...existing.map((l) => l.ticket_id), ...newLinks.map((l) => l.ticket_id)];
}

// Post a resolution message to every ticket linked to an issue.
export async function postResolutionToTickets(base44, issue, resolutionNote, authorEmail) {
  const links = await base44.entities.TicketIssueLink.filter({ issue_id: issue.id }, null, 100);
  if (!links.length) return;

  const body = `This issue has been resolved.\n\nIssue: ${issue.title}\nResolution: ${resolutionNote || issue.fix_notes || "Resolved."}\n\nWe apologize for any inconvenience. If you are still experiencing a problem, please reply to this ticket.`;

  for (const link of links) {
    try {
      await base44.entities.TicketMessage.create({
        club_id: link.club_id,
        ticket_id: link.ticket_id,
        ticket_number: link.ticket_number,
        author_name: "System Monitoring",
        author_email: authorEmail || "system@clubrudder.com",
        author_type: "system",
        message_type: "system_note",
        body,
      });
      await base44.entities.Ticket.update(link.ticket_id, { status: "resolved", resolution_notes: body });
      await base44.entities.TicketIssueLink.update(link.id, { resolution_posted: true, ticket_status: "resolved" });
    } catch (e) { /* continue */ }
  }
}