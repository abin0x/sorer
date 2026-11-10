// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Incident management: declare, post updates, toggle banner, resolve, and
// email affected club admins. System owner / admin only.
//
// Payload: { action: "declare"|"update"|"resolve"|"toggle_banner",
//            incident_id?, name?, severity?, affected_club_ids?, banner_message?,
//            message?, notify_club_admins?, is_public? }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const isOwner = user.role === "admin" || ["system_owner", "system_admin"].includes(user.system_role);
    if (!isOwner) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action = "declare", incident_id } = body;
    const now = new Date().toISOString();

    if (action === "declare") {
      const { name, severity = "P2", affected_club_ids = [], banner_message = "", notify_club_admins = false, is_public = true, issue_ids = [] } = body;
      if (!name) return Response.json({ error: "name is required" }, { status: 400 });
      const clubs = affected_club_ids.length ? await base44.asServiceRole.entities.Club.filter({ id: { $in: affected_club_ids } }, null, 100) : [];
      const inc = await base44.asServiceRole.entities.Incident.create({
        name, status: "investigating", severity,
        affected_club_ids, affected_club_names: clubs.map((c) => c.name),
        updates: [{ timestamp: now, status: "investigating", message: banner_message || name, author: user.email }],
        start_time: now, banner_message, show_banner: !!banner_message, is_public,
        issue_ids, notify_club_admins, declared_by: user.email,
      });
      if (notify_club_admins) await emailClubAdmins(base44, inc, banner_message || name);
      return Response.json({ status: "ok", incident: inc });
    }

    if (!incident_id) return Response.json({ error: "incident_id is required" }, { status: 400 });
    const inc = await base44.asServiceRole.entities.Incident.get(incident_id);
    if (!inc) return Response.json({ error: "Incident not found" }, { status: 404 });

    if (action === "update") {
      const { message, status = inc.status, banner_message } = body;
      const updates = [...(inc.updates || []), { timestamp: now, status, message: message || "", author: user.email }];
      const patch = { updates, status };
      if (banner_message !== undefined) { patch.banner_message = banner_message; patch.show_banner = !!banner_message; }
      const updated = await base44.asServiceRole.entities.Incident.update(incident_id, patch);
      if (inc.notify_club_admins) await emailClubAdmins(base44, updated, message || banner_message || inc.name);
      return Response.json({ status: "ok", incident: updated });
    }

    if (action === "resolve") {
      const { message = "This incident has been resolved." } = body;
      const updates = [...(inc.updates || []), { timestamp: now, status: "resolved", message, author: user.email }];
      const updated = await base44.asServiceRole.entities.Incident.update(incident_id, {
        status: "resolved", end_time: now, show_banner: false, updates,
      });
      if (inc.notify_club_admins) await emailClubAdmins(base44, updated, message);
      // Mark linked issues resolved
      if (inc.issue_ids?.length) {
        for (const iid of inc.issue_ids) {
          try { await base44.asServiceRole.entities.Issue.update(iid, { status: "resolved", resolved_at: now, resolved_by: user.email }); } catch (e) {}
        }
      }
      return Response.json({ status: "ok", incident: updated });
    }

    if (action === "toggle_banner") {
      const updated = await base44.asServiceRole.entities.Incident.update(incident_id, { show_banner: !!body.show_banner });
      return Response.json({ status: "ok", incident: updated });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function emailClubAdmins(base44, incident, message) {
  if (!incident.affected_club_ids?.length) return;
  const clubs = await base44.entities.Club.filter({ id: { $in: incident.affected_club_ids } }, null, 100);
  for (const club of clubs) {
    try {
      const admins = await base44.entities.UserRoles.filter({ club_id: club.id, role: { $in: ["club_admin", "club_director"] }, status: "active" }, null, 50);
      const emails = admins.map((a) => a.email).filter(Boolean);
      for (const email of emails) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `Service update: ${incident.name}`,
            body: `Hello,\n\nThere is a service update affecting ${club.name}.\n\n${incident.name} — ${incident.status}\n\n${message}\n\nWe will keep you informed as this progresses. Thank you for your patience.\n\n— Club Rudder Team`,
          });
        } catch (e) {}
      }
    } catch (e) {}
  }
}