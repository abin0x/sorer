import { low, readPages } from './migrationChunkIO.ts';
const clean = (record) => Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
export async function chunkPayload(svc, job, phase, rows, index) {
  const emails = [...new Set(rows.map(r => low(r.guardian_email)).filter(Boolean))];
  const names = [...new Set(rows.map(r => r.team_name).filter(Boolean))];
  const [guardians, teams] = phase === 'players' ? await Promise.all([
    emails.length ? readPages(svc.entities.Guardian, { club_id: job.club_id, email: { $in: emails } }, ['id', 'email']) : [],
    names.length ? readPages(svc.entities.Team, { club_id: job.club_id, name: { $in: names } }, ['id', 'name']) : [],
  ]) : [[], []];
  const guardianMap = new Map(guardians.map(g => [low(g.email), g.id]));
  const teamMap = new Map(teams.map(t => [low(t.name), t.id]));
  return rows.map((r, offset) => {
    const stamp = { club_id: job.club_id, unique_id: r.unique_id || `${job.id}:${phase}:${index + offset}`, source: 'migration', migration_batch_id: job.id };
    if (phase === 'teams') return clean({ ...stamp, name: r.name || 'Imported Team', age_group: r.age_group || '', gender: ['Girls', 'Boys'].includes(r.gender) ? r.gender : 'Boys and Girls', playing_format: r.playing_format || '11v11', season: r.season || '', location_id: r.location_id || undefined, coach_id: r.coach_id || undefined });
    if (phase === 'guardians') {
      if (!r.email) throw Object.assign(new Error(`Guardian row ${index + offset + 1} has no email; correct the staged record before continuing.`), { status: 422 });
      const record = { ...stamp, first_name: r.first_name, last_name: r.last_name, email: low(r.email), relationship: 'guardian' };
      for (const field of ['phone', 'street_address', 'address_line_2', 'city', 'state', 'zip_code', 'household_id']) if (r[field]) record[field] = r[field];
      return record;
    }
    const guardianId = guardianMap.get(low(r.guardian_email)) || job.commit_progress?.emailToGuardianId?.[low(r.guardian_email)];
    if (!guardianId) throw Object.assign(new Error(`Player row ${index + offset + 1} has no imported guardian. Correct the guardian link before continuing.`), { status: 422 });
    return clean({ ...stamp, first_name: r.first_name, last_name: r.last_name, date_of_birth: r.date_of_birth || '2010-01-01', gender: r.gender || undefined, team_id: teamMap.get(low(r.team_name)) || job.commit_progress?.teamNameToId?.[low(r.team_name)] || undefined, team_name: r.team_name || '', guardian_id: guardianId, guardian_ids: [guardianId], program_title: r.program_title || undefined, status: r.status === 'inactive' ? 'inactive' : 'active', notes: r.notes || undefined });
  });
}