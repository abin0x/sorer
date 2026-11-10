// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { runRulesForClub, seasonStartReminders, BODIES_LABEL } from '../../shared/compliance.ts';

// Daily scheduled run of the compliance flagging rules across all clubs.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || (user.role !== 'admin' && user.system_role !== 'system_owner' && user.system_role !== 'system_admin')) {
      const authHeader = req.headers.get('authorization') || '';
      const cronSecret = Deno.env.get('CRON_SECRET');
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const targetClubId: string | null = body.club_id || null;
    const res = await db.ComplianceSettings.filter(targetClubId ? { club_id: targetClubId } : {}, { limit: 1000 });
    const settings = Array.isArray(res) ? res : res.items || [];
    const results: any[] = [];
    for (const s of settings) {
      if (!s.governing_bodies?.length) continue;
      const rules: any = await runRulesForClub(db, s.club_id).catch((e: Error) => ({ error: e.message }));
      // Send branded warning emails to coaches whose compliance was newly flagged today.
      if (rules?.toEmail?.length) {
        const byEmail = new Map<string, { name: string; items: string[] }>();
        for (const n of rules.toEmail) {
          const key = n.email.toLowerCase();
          if (!byEmail.has(key)) byEmail.set(key, { name: n.name, items: [] });
          byEmail.get(key)!.items.push(n.item);
        }
        for (const [email, { name, items }] of byEmail) {
          await base44.integrations.Core.SendEmail({
            to: email, template_name: 'ComplianceWarning',
            variables: { coach_name: name || 'Coach', season: rules.season_name || 'current season', items: items.join('\n') },
          }).catch((e: Error) => console.error('warning email failed', e.message));
        }
      }
      const reminder = await seasonStartReminders(db, s.club_id).catch((e: Error) => ({ error: e.message }));
      if (reminder?.sent) {
        for (const nc of reminder.reminded) {
          await base44.integrations.Core.SendEmail({
            to: nc.email, template_name: 'ComplianceReminder',
            variables: { season: reminder.season, start_date: reminder.start, items: nc.items.join(', ') },
          }).catch((e: Error) => console.error('reminder email failed', e.message));
        }
      }
      results.push({ club_id: s.club_id, rules, reminders: reminder.sent || 0 });
    }
    return Response.json({ clubs: results.length, results });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}