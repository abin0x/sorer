import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { postResolutionToTickets } from '../../shared/issueMonitor.ts';

// Manage an existing issue: update status, assign owner, record root cause /
// fix notes, and resolve (which posts a resolution message to every linked
// ticket). System owner / admin only.
//
// Payload: { issue_id, action: "update"|"resolve"|"assign", status?, owner?,
//            root_cause?, fix_notes?, incident_id?, resolution_note? }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const isOwner = user.role === "admin" || ["system_owner", "system_admin", "system_support"].includes(user.system_role);
    if (!isOwner) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { issue_id, action = "update", status, owner, root_cause, fix_notes, incident_id, resolution_note } = body;
    if (!issue_id) return Response.json({ error: "issue_id is required" }, { status: 400 });

    const issue = await base44.asServiceRole.entities.Issue.get(issue_id);
    if (!issue) return Response.json({ error: "Issue not found" }, { status: 404 });

    const patch = {};
    if (action === "assign") patch.owner = owner || user.email;
    if (status) patch.status = status;
    if (root_cause !== undefined) patch.root_cause = root_cause;
    if (fix_notes !== undefined) patch.fix_notes = fix_notes;
    if (incident_id !== undefined) patch.incident_id = incident_id;

    let updated = issue;
    if (Object.keys(patch).length) updated = await base44.asServiceRole.entities.Issue.update(issue_id, patch);

    // Resolve: set resolved + post to linked tickets
    if (action === "resolve" || status === "resolved") {
      const now = new Date().toISOString();
      updated = await base44.asServiceRole.entities.Issue.update(issue_id, {
        status: "resolved", resolved_at: now, resolved_by: user.email,
        fix_notes: fix_notes || issue.fix_notes || "",
      });
      await postResolutionToTickets(base44.asServiceRole, updated, resolution_note || fix_notes, user.email);
    }

    return Response.json({ status: "ok", issue: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}