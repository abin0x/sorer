import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { canManageMigrationClub, isMigrationReviewer } from '../../shared/migrationAccess.ts';
import { ENTITIES, TARGETS, publicTargets, parseFile, detectEntity, proposeMapping } from '../../shared/migrationAutomap.ts';
import { HttpError, readPrivateFile, sha256 } from '../../shared/migrationFiles.ts';

const STATUSES = ['auto', 'suggested', 'unmapped', 'confirmed', 'edited', 'ignored', 'kept'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;
    const body = await req.json();
    const who = user.email || user.id;

    // Tenant gate: the club always comes from the stored project/file, never from a CSV.
    const allow = async (clubId) => {
      if (!clubId) throw new HttpError(400, 'club_id is required');
      if (!isMigrationReviewer(user) && !(await canManageMigrationClub(svc, user, clubId))) {
        throw new HttpError(403, 'You do not have access to this club');
      }
    };
    const loadProject = async (id) => {
      const project = id ? await svc.entities.MigrationProject.get(id) : null;
      if (!project) throw new HttpError(404, 'Project not found');
      await allow(project.club_id);
      return project;
    };
    const loadFile = async (id) => {
      const file = id ? await svc.entities.MigrationFile.get(id) : null;
      if (!file) throw new HttpError(404, 'File not found');
      await allow(file.club_id);
      return file;
    };
    const setStatus = async (project, status, note) => {
      if (project.status === status) return project;
      const history = [...(project.history || []), { status, by: who, at: new Date().toISOString(), note: note || '' }];
      return svc.entities.MigrationProject.update(project.id, { status, history });
    };
    const fetchParsed = async (fileUri) => {
      const { text, encoding, bytes } = await readPrivateFile(svc, fileUri);
      const parsed = parseFile(text);
      if (!parsed.headers.length) throw new HttpError(400, 'The file has no header row');
      return { parsed, encoding, checksum: await sha256(bytes) };
    };
    const saveMappings = async (file, project, entity, parsed) => {
      await svc.entities.ColumnMapping.deleteMany({ file_id: file.id, club_id: file.club_id });
      const records = proposeMapping(parsed, entity).map((r) => ({ ...r, file_id: file.id, project_id: project.id, club_id: file.club_id }));
      if (records.length) await svc.entities.ColumnMapping.bulkCreate(records);
    };

    switch (body.action) {
      case 'list_projects': {
        await allow(body.club_id);
        const projects = await svc.entities.MigrationProject.filter({ club_id: body.club_id }, '-created_date', 50);
        return Response.json({ projects });
      }

      case 'create_project': {
        await allow(body.club_id);
        const name = String(body.name || '').trim();
        if (!name) throw new HttpError(400, 'Project name is required');
        const project = await svc.entities.MigrationProject.create({
          club_id: body.club_id,
          name,
          status: 'draft',
          source_system: body.source_system || 'spreadsheet_other',
          season: body.season || '',
          created_by_user_id: user.id,
          created_by_name: user.full_name || who,
          history: [{ status: 'draft', by: who, at: new Date().toISOString(), note: 'Project created' }],
        });
        return Response.json({ project });
      }

      case 'get_project': {
        const project = await loadProject(body.project_id);
        const [files, mappings] = await Promise.all([
          svc.entities.MigrationFile.filter({ project_id: project.id, club_id: project.club_id }, 'created_date', 100),
          svc.entities.ColumnMapping.filter({ project_id: project.id, club_id: project.club_id }, 'source_index', 2000),
        ]);
        return Response.json({ project, files, mappings, targets: publicTargets() });
      }

      case 'register_file': {
        const project = await loadProject(body.project_id);
        if (!['draft', 'files_uploaded', 'analyzed', 'mapping_review'].includes(project.status)) {
          throw new HttpError(409, 'Files can no longer be added to this project');
        }
        if (!body.file_uri) throw new HttpError(400, 'file_uri is required');
        const { parsed, encoding, checksum } = await fetchParsed(body.file_uri);
        const { entity, scores } = detectEntity(parsed);
        const file = await svc.entities.MigrationFile.create({
          project_id: project.id,
          club_id: project.club_id,
          file_uri: body.file_uri,
          original_name: String(body.original_name || 'upload.csv').slice(0, 200),
          detected_entity: entity,
          selected_entity: entity,
          detection_scores: scores,
          row_count: parsed.rowCount,
          blank_row_count: parsed.blankRows,
          column_count: parsed.headers.length,
          checksum,
          encoding,
          delimiter: parsed.delimiter,
          status: 'analyzed',
          uploaded_by: who,
        });
        await saveMappings(file, project, entity, parsed);
        if (project.status === 'draft' || project.status === 'files_uploaded') await setStatus(project, 'analyzed', 'File analyzed');
        return Response.json({ file });
      }

      case 'set_entity': {
        const file = await loadFile(body.file_id);
        if (!ENTITIES.includes(body.entity)) throw new HttpError(400, 'Unsupported entity');
        const project = await loadProject(file.project_id);
        const { parsed } = await fetchParsed(file.file_uri);
        await saveMappings(file, project, body.entity, parsed);
        await svc.entities.MigrationFile.update(file.id, { selected_entity: body.entity, status: 'analyzed' });
        return Response.json({ ok: true });
      }

      case 'save_mapping': {
        const file = await loadFile(body.file_id);
        const project = await loadProject(file.project_id);
        const rows = await svc.entities.ColumnMapping.filter({ file_id: file.id, club_id: file.club_id }, 'source_index', 2000);
        const updates = new Map((body.updates || []).map((u) => [u.id, u]));
        const next = rows.map((r) => {
          const u = updates.get(r.id);
          if (!u) return r;
          const n = { ...r };
          if (typeof u.target_field === 'string') {
            if (u.target_field && !TARGETS[r.target_entity].some((x) => x.name === u.target_field)) throw new HttpError(400, 'Unknown target field');
            n.target_field = u.target_field;
          }
          if (u.status) {
            if (!STATUSES.includes(u.status)) throw new HttpError(400, 'Unknown status');
            n.status = u.status;
          }
          if (u.value_map && typeof u.value_map === 'object') n.value_map = u.value_map;
          return n;
        });

        // One column per field, per group.
        const taken = new Set();
        for (const r of next) {
          if (!r.target_field || ['ignored', 'kept', 'unmapped'].includes(r.status)) continue;
          const key = `${r.group}|${r.target_field}`;
          if (taken.has(key)) throw new HttpError(400, `Two columns cannot map to the same field (${r.target_field})`);
          taken.add(key);
        }

        const warnings = [];
        if (body.confirm) {
          const undecided = next.filter((r) => !r.target_field && r.status === 'unmapped');
          if (undecided.length) {
            throw new HttpError(400, `${undecided.length} column(s) still need a decision (map, ignore, or keep in source data): ${undecided.slice(0, 5).map((r) => r.source_column).join(', ')}`);
          }
          const entity = file.selected_entity;
          const have = new Set(next.filter((r) => r.group === 0 && r.target_field && r.status !== 'ignored').map((r) => r.target_field));
          const missing = TARGETS[entity].filter((x) => x.required && !have.has(x.name)).map((x) => x.label);
          if (missing.length) throw new HttpError(400, `Required fields are not mapped: ${missing.join(', ')}`);
          if (entity === 'Player' && !next.some((r) => r.group > 0 && r.target_field) && !next.some((r) => r.group === 0 && r.target_field === 'unique_id')) {
            warnings.push('No guardian columns were found. Players need a guardian, so the specialist will ask for a guardian file.');
          }
        }

        const patch = next.map((r) => {
          let status = r.status;
          if (body.confirm && r.target_field && ['auto', 'suggested'].includes(status)) status = 'confirmed';
          return { id: r.id, target_field: r.target_field, status, value_map: r.value_map || {}, decided_by: updates.has(r.id) || body.confirm ? who : r.decided_by || '' };
        });
        for (let i = 0; i < patch.length; i += 200) await svc.entities.ColumnMapping.bulkUpdate(patch.slice(i, i + 200));

        if (body.confirm) {
          await svc.entities.MigrationFile.update(file.id, { status: 'confirmed', confirmed_by: who, confirmed_at: new Date().toISOString() });
        }
        if (['analyzed', 'files_uploaded'].includes(project.status)) await setStatus(project, 'mapping_review', 'Mapping review started');
        return Response.json({ ok: true, warnings });
      }

      default:
        throw new HttpError(400, 'Unknown action');
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}