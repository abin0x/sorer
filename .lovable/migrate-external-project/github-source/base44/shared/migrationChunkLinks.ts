import { readPages, low } from './migrationChunkIO.ts';
// One entity page per request, rather than a whole-club link pass.
export async function linkChunk(svc, job, progress, size, arrays) {
  const entity = progress.link_entity || 'Team';
  const skip = progress.link_cursor || 0;
  const owners = await svc.entities[entity].filter({ club_id: job.club_id, migration_batch_id: job.id }, 'id', size, skip, ['id', 'name', 'player_ids', 'team_manager_ids']);
  if (owners.length) {
    const field = entity === 'Team' ? 'team_id' : 'guardian_id';
    const players = await readPages(svc.entities.Player, { club_id: job.club_id, migration_batch_id: job.id, [field]: { $in: owners.map(o => o.id) } }, ['id', field]);
    const ids = new Map();
    for (const player of players) ids.set(player[field], [...(ids.get(player[field]) || []), player.id]);
    let managers = [];
    const parents = entity === 'Team' ? arrays.finalGuardians.filter(g => g.is_team_parent && g.email) : [];
    if (parents.length) managers = await readPages(svc.entities.Guardian, { club_id: job.club_id, email: { $in: parents.map(g => low(g.email)) } }, ['id', 'email']);
    const managerIds = new Map(managers.map(g => [low(g.email), g.id]));
    const managerMap = new Map();
    const ownerNames = new Map(owners.map(o => [low(o.name), o.id]));
    for (const player of arrays.importablePlayers) {
      const ownerId = ownerNames.get(low(player.team_name));
      const managerId = managerIds.get(low(player.guardian_email));
      if (ownerId && managerId) managerMap.set(ownerId, [...new Set([...(managerMap.get(ownerId) || []), managerId])]);
    }
    const updates = owners.map(owner => ({ id: owner.id, player_ids: [...new Set([...(owner.player_ids || []), ...(ids.get(owner.id) || [])])], ...(managerMap.has(owner.id) ? { team_manager_ids: [...new Set([...(owner.team_manager_ids || []), ...managerMap.get(owner.id)])] } : {}) }));
    await svc.entities[entity].bulkUpdate(updates);
  }
  if (owners.length < size) {
    if (entity === 'Team') return { ...progress, link_entity: 'Guardian', link_cursor: 0 };
    return { ...progress, phase: 'done', link_cursor: 0 };
  }
  return { ...progress, link_entity: entity, link_cursor: skip + owners.length };
}