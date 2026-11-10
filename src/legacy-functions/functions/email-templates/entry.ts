// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Reads and writes generated email template files in base44/emails/.
// GET (action: 'list') returns the current file contents.
// POST (action: 'save') overwrites a template file (or falls back to entity override).
const PATH_CANDIDATES = [
  'base44/emails',
  './base44/emails',
  '/app/base44/emails',
];

async function findEmailsDir(): Promise<string | null> {
  for (const p of PATH_CANDIDATES) {
    try {
      for await (const _ of Deno.readDir(p)) return p;
    } catch { /* try next */ }
  }
  return null;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin' ||
      ['system_owner', 'system_admin'].includes(user.system_role || '') ||
      ['club_admin', 'club_director'].includes(user.custom_role || '');
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';

    if (action === 'list') {
      const dir = await findEmailsDir();
      if (!dir) return Response.json({ templates: [], source: 'fallback' });
      const templates: { name: string; content: string }[] = [];
      for await (const entry of Deno.readDir(dir)) {
        if (entry.name.endsWith('.html')) {
          const name = entry.name.replace('.html', '');
          const content = await Deno.readTextFile(`${dir}/${entry.name}`);
          templates.push({ name, content });
        }
      }
      return Response.json({ templates, source: 'filesystem' });
    }

    if (action === 'save') {
      const { name, content } = body;
      if (!name || !content) return Response.json({ error: 'name and content required' }, { status: 400 });
      if (!/^[A-Za-z0-9_-]+$/.test(name)) return Response.json({ error: 'Invalid template name' }, { status: 400 });

      const dir = await findEmailsDir();
      if (dir) {
        try {
          await Deno.writeTextFile(`${dir}/${name}.html`, content);
          return Response.json({ success: true, method: 'file' });
        } catch (e) {
          console.error('filesystem write failed', (e as Error).message);
        }
      }

      // Fallback: store as entity override
      const existing = await base44.entities.EmailTemplate.filter({ template_type: `file:${name}` }).catch(() => []);
      const record = Array.isArray(existing) ? existing[0] : (existing.items || [])[0];
      if (record) {
        await base44.entities.EmailTemplate.update(record.id, { body: content });
      } else {
        await base44.entities.EmailTemplate.create({
          template_type: `file:${name}`, subject: name, body: content, is_active: true,
        });
      }
      return Response.json({ success: true, method: 'entity' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('email-templates error', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}