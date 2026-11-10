// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Public tryout endpoint: listing, event lookup, registration (duplicate merge + waitlist), cancel (auto-promote).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const body = await req.json();
    const { action } = body;

    const counts = async (eventId: string) => {
      const regs = await db.TryoutRegistration.filter({ tryout_event_id: eventId }, 'created_date', 1000);
      const waitlisted = regs.filter((r: any) => r.status === 'waitlist').length;
      return { regs, waitlisted, registered: regs.length - waitlisted };
    };

    if (action === 'list') {
      const today = new Date().toISOString().slice(0, 10);
      const events = await db.TryoutEvent.filter({ club_id: body.club_id, date: { $gte: today } }, 'date', 100);
      const plans = await db.TryoutPlan.filter({ club_id: body.club_id }, '-created_date', 200);
      const planMap: Record<string, any> = {};
      plans.forEach((p: any) => { planMap[p.id] = p; });
      const club = await db.Club.get(body.club_id).catch(() => null);
      return Response.json({
        club_name: club?.name || '',
        sessions: events.map((e: any) => ({
          id: e.id, type: e.type, date: e.date, start_time: e.start_time, end_time: e.end_time, location: e.location,
          capacity: e.expected_attendance || null, registered: e.registration_count || 0,
          title: planMap[e.tryout_plan_id]?.title || '', age_group: planMap[e.tryout_plan_id]?.age_group || '',
          gender: planMap[e.tryout_plan_id]?.gender || '',
        })),
      });
    }

    if (action === 'get') {
      const event = await db.TryoutEvent.get(body.event_id);
      if (!event) return Response.json({ error: 'Not found' }, { status: 404 });
      const plan = event.tryout_plan_id ? await db.TryoutPlan.get(event.tryout_plan_id).catch(() => null) : null;
      const c = await counts(event.id);
      // Public view: only what the signup page shows — never staff notes or other families' data.
      const pubEvent = { id: event.id, club_id: event.club_id, type: event.type, date: event.date, start_time: event.start_time, end_time: event.end_time, location: event.location, expected_attendance: event.expected_attendance, tryout_plan_id: event.tryout_plan_id, status: event.status };
      const pubPlan = plan ? { id: plan.id, club_id: plan.club_id, title: plan.title, age_group: plan.age_group, gender: plan.gender, description: plan.description, season: plan.season } : null;
      return Response.json({ event: pubEvent, plan: pubPlan, registered: c.registered, waitlisted: c.waitlisted });
    }

    if (action === 'register') {
      const { event_id, form, utm_source, utm_campaign } = body;
      const email = String(form.guardian_email || '').trim().toLowerCase();
      if (!event_id || !form.player_first_name || !form.player_last_name || !form.guardian_name || !email) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const event = await db.TryoutEvent.get(event_id);
      if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
      const plan = event.tryout_plan_id ? await db.TryoutPlan.get(event.tryout_plan_id).catch(() => null) : null;
      const clubId = event.club_id;
      const playerName = `${form.player_first_name} ${form.player_last_name}`.trim();

      const { regs, registered } = await counts(event_id);
      const dup = regs.find((r: any) => (r.guardian_email || '').toLowerCase() === email && (r.player_name || '').trim().toLowerCase() === playerName.toLowerCase());
      if (dup) {
        // Do not reveal the existing code to whoever typed the same name and email.
        return Response.json({ status: dup.status, merged: true });
      }

      // Guardian + player: reuse matches, otherwise create
      let guardian = (await db.Guardian.filter({ email: form.guardian_email.trim(), club_id: clubId }, null, 1))[0];
      if (!guardian) {
        const parts = form.guardian_name.trim().split(' ');
        guardian = await db.Guardian.create({
          club_id: clubId, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '',
          email: form.guardian_email.trim(), phone: form.guardian_phone || '',
        });
      }
      const family = await db.Player.filter({ guardian_id: guardian.id }, null, 50);
      let player = family.find((p: any) => `${p.first_name} ${p.last_name}`.toLowerCase() === playerName.toLowerCase());
      if (!player) {
        player = await db.Player.create({
          club_id: clubId, first_name: form.player_first_name, last_name: form.player_last_name,
          date_of_birth: form.player_date_of_birth || undefined, gender: plan?.gender || undefined,
          guardian_id: guardian.id, guardian_name: form.guardian_name, status: 'pending',
          position: form.preferred_position || '',
          notes: form.current_club ? `Current club: ${form.current_club}` : '',
        });
      }

      const capacity = event.expected_attendance || 0;
      const waitlist = capacity > 0 && registered >= capacity;
      const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
      const reg = await db.TryoutRegistration.create({
        club_id: clubId, tryout_event_id: event_id, player_id: player.id, player_name: playerName,
        guardian_name: form.guardian_name, guardian_email: form.guardian_email.trim(), guardian_phone: form.guardian_phone || '',
        desired_age_group: plan?.age_group || '', registered_date: new Date().toISOString().slice(0, 10),
        status: waitlist ? 'waitlist' : 'registered', check_in_code: code, source: 'outside',
        utm_source: utm_source || '', utm_campaign: utm_campaign || '',
        notes: [form.current_club && `Current club: ${form.current_club}`, form.preferred_position && `Position: ${form.preferred_position}`, form.comments && `Comments: ${form.comments}`].filter(Boolean).join('\n'),
      });
      if (!waitlist) await db.TryoutEvent.update(event_id, { registration_count: registered + 1 });
      return Response.json({ status: reg.status, merged: false, check_in_code: code, registration_id: reg.id });
    }

    if (action === 'cancel') {
      const { event_id, check_in_code } = body;
      if (!event_id || !check_in_code) return Response.json({ error: 'Missing code' }, { status: 400 });
      const { regs } = await counts(event_id);
      const reg = regs.find((r: any) => (r.check_in_code || '').toUpperCase() === String(check_in_code).toUpperCase());
      if (!reg) return Response.json({ error: 'Registration not found' }, { status: 404 });
      await db.TryoutRegistration.delete(reg.id);
      let promoted: string | null = null;
      if (reg.status !== 'waitlist') {
        const next = regs.find((r: any) => r.status === 'waitlist' && r.id !== reg.id);
        if (next) {
          await db.TryoutRegistration.update(next.id, { status: 'registered' });
          promoted = next.player_name;
          await db.Notification.create({
            club_id: reg.club_id, user_email: next.guardian_email, type: 'announcement', title: 'A tryout spot opened up',
            message: `${next.player_name} has been moved off the waitlist and is now registered.`,
          }).catch(() => {});
        }
      }
      const c = await counts(event_id);
      await db.TryoutEvent.update(event_id, { registration_count: c.registered });
      return Response.json({ cancelled: true, promoted: !!promoted });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}