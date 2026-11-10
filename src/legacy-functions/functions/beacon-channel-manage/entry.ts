// @ts-nocheck
// beacon-channel-manage — add, edit or remove a Beacon channel.
// Club staff may manage any channel in their club; team managers only their own
// team's channels. Writes use the service client after those checks.
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { canManageChannels, isCustomChannel, CHANNEL_KINDS } from '@/lib/beaconChannelAdmin.js';

const rows = (r) => (Array.isArray(r) ? r : r?.items || []);
const clean = (s, n) => String(s || "").trim().slice(0, n);

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.club_id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const svc = base44.asServiceRole;
    const clubId = user.club_id;
    const { op, channel_id, team_id, name, description, type } = await req.json().catch(() => ({}));
    const teams = rows(await svc.entities.Team.filter({ club_id: clubId }, "-created_date", 500));

    if (op === "create") {
      const kind = CHANNEL_KINDS.find((k) => k.type === type);
      const team = team_id ? teams.find((t) => t.id === team_id) : null;
      if (!kind || (team_id && !team)) return Response.json({ error: "Invalid channel" }, { status: 400 });
      if (!canManageChannels(user, team?.id || null, teams)) return Response.json({ error: "Forbidden" }, { status: 403 });
      const title = clean(name, 60);
      if (!title) return Response.json({ error: "Name is required" }, { status: 400 });
      const created = await svc.entities.Channel.create({
        club_id: clubId, name: title, description: clean(description, 200) || null, type: kind.type,
        scope: team ? "team" : "club", team_id: team?.id || null, team_name: team?.name || null,
        allow_replies: kind.allow_replies, created_by: user.email, created_by_id: user.id, sort_order: 100,
      });
      return Response.json({ channel: created });
    }

    const existing = channel_id ? await svc.entities.Channel.get(channel_id).catch(() => null) : null;
    if (!existing || existing.club_id !== clubId) return Response.json({ error: "Not found" }, { status: 404 });
    if (!canManageChannels(user, existing.scope === "team" ? existing.team_id : null, teams)) return Response.json({ error: "Forbidden" }, { status: 403 });

    if (op === "update") {
      const title = clean(name, 60);
      if (!title) return Response.json({ error: "Name is required" }, { status: 400 });
      const updated = await svc.entities.Channel.update(existing.id, { name: title, description: clean(description, 200) || null });
      return Response.json({ channel: updated });
    }
    if (op === "delete") {
      if (!isCustomChannel(existing)) return Response.json({ error: "Built-in channels can be renamed but not removed." }, { status: 400 });
      await svc.entities.Channel.delete(existing.id);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown operation" }, { status: 400 });
  } catch (error) {
    console.error("beacon-channel-manage error:", error?.message);
    return Response.json({ error: error?.message || "Unable to update channel" }, { status: 500 });
  }
}
