// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { logAudit } from '../../shared/auditLog.ts';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

const appUrl = () => (process.env.WIX_CHECKOUT_APP_URL || 'https://club-rudder-os.base44.app').replace(/\/$/, '');
const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Setup Journey backend. Every call is scoped to the caller's own club (system users may pass club_id).
// Actions: open | set_step | save_draft | save_profile | members

const STEP_STATES = ['not_started', 'in_progress', 'needs_review', 'blocked', 'done', 'skipped', 'deferred'];
const STAGES = ['A', 'B', 'C', 'D', 'E', 'F'];
const START_PATHS = ['upload', 'known_system', 'fresh', 'assisted'];
const LEADER_ROLES = ['club_admin', 'club_director', 'master_admin', 'admin'];
const GO_LIVE_STEP = 'd_wave';
const HEX = /^#[0-9a-fA-F]{6}$/;

const isSystem = (u: any) => !!(u?.system_role || u?.is_super_admin === true || u?.role === 'admin');
const isLeader = (u: any) => isSystem(u) || LEADER_ROLES.includes(u?.custom_role);
const now = () => new Date().toISOString();

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) || {};
    const clubId = isSystem(user) && body.club_id ? body.club_id : user.club_id;
    if (!clubId) return Response.json({ error: 'No club is linked to your account' }, { status: 400 });

    const svc = base44.asServiceRole;
    const club = (await svc.entities.Club.filter({ id: clubId }))[0];
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    let journey = (await svc.entities.OnboardingJourney.filter({ club_id: clubId }))[0];
    if (!journey) {
      journey = await svc.entities.OnboardingJourney.create({
        club_id: clubId, club_name: club.name, status: 'active', current_stage: 'A', steps: {},
        source_system: club.source_system || '', specialist_name: club.assigned_specialist_name || '',
      });
    }

    const audit = (action: string, metadata: any) =>
      logAudit(base44, { club_id: clubId, user, action, entity_type: 'OnboardingJourney', entity_id: journey.id, metadata });
    const touch = (extra: any = {}) =>
      svc.entities.OnboardingJourney.update(journey.id, { last_active_at: now(), last_active_by: user.email, ...extra });
    const clubView = (c: any) => ({
      id: c.id, name: c.name, logo_url: c.logo_url, primary_color: c.primary_color, secondary_color: c.secondary_color,
      timezone: c.timezone, season_naming: c.season_naming, season_start_month: c.season_start_month,
      season_end_month: c.season_end_month, age_group_convention: c.age_group_convention, start_path: c.start_path,
      tenant_status: c.tenant_status, go_live_date: c.go_live_date, source_system: c.source_system,
    });
    const respond = async (j: any, c: any) => Response.json({ journey: j, club: clubView(c), can_edit: isLeader(user) });

    switch (body.action) {
      case 'open': {
        const firstOpen = !journey.last_active_at;
        if (club.tenant_status === 'invited' && !isSystem(user)) {
          await svc.entities.Club.update(clubId, { tenant_status: 'onboarding' });
          club.tenant_status = 'onboarding';
          await logAudit(base44, { club_id: clubId, user, action: 'club_status_changed', entity_type: 'Club', entity_id: clubId, metadata: { from: 'invited', to: 'onboarding' } });
        }
        if (!isSystem(user)) journey = await touch();
        if (firstOpen) await audit('journey_opened', { first_open: true });
        return respond(journey, club);
      }

      case 'set_step': {
        const key = String(body.step_key || '');
        if (!/^[a-f]_[a-z_]+$/.test(key)) return Response.json({ error: 'Invalid step' }, { status: 400 });
        if (body.state && !STEP_STATES.includes(body.state)) return Response.json({ error: 'Invalid state' }, { status: 400 });

        const steps = { ...(journey.steps || {}) };
        const prev = steps[key] || { state: 'not_started' };
        const mine = (prev.assignee_email || '').toLowerCase() === (user.email || '').toLowerCase();
        if (!isLeader(user) && !mine) return Response.json({ error: 'This step is not assigned to you' }, { status: 403 });
        if (!isLeader(user) && body.assignee_email !== undefined) return Response.json({ error: 'Only an admin can assign steps' }, { status: 403 });

        const next = { ...prev, updated_at: now(), updated_by: user.email };
        if (body.state) next.state = body.state;
        if (body.note !== undefined) next.note = String(body.note).slice(0, 500);
        if (body.assignee_email !== undefined) {
          next.assignee_email = String(body.assignee_email || '').trim().toLowerCase();
          next.assignee_name = next.assignee_email ? String(body.assignee_name || '').slice(0, 120) : '';
        }
        steps[key] = next;

        const stage = STAGES.includes(body.stage) ? body.stage : journey.current_stage;
        journey = await touch({ steps, current_stage: stage, last_step_key: key });
        await audit('journey_step_changed', {
          step_key: key, from: prev.state, to: next.state, note: next.note || '',
          assignee: next.assignee_email || '', assignee_changed: body.assignee_email !== undefined,
        });

        if (key === GO_LIVE_STEP && next.state === 'done' && club.tenant_status !== 'live') {
          await svc.entities.Club.update(clubId, { tenant_status: 'live', go_live_date: now() });
          club.tenant_status = 'live';
          await logAudit(base44, { club_id: clubId, user, action: 'club_went_live', entity_type: 'Club', entity_id: clubId, metadata: { trigger: key } });
        }
        return respond(journey, club);
      }

      case 'save_draft': {
        const stage = STAGES.includes(body.stage) ? body.stage : journey.current_stage;
        journey = await touch({
          draft: body.draft && typeof body.draft === 'object' ? body.draft : journey.draft,
          current_stage: stage, last_step_key: body.step_key ? String(body.step_key) : journey.last_step_key,
        });
        if (body.exit) await audit('journey_saved_exit', { stage, step_key: body.step_key || '' });
        return respond(journey, club);
      }

      case 'save_profile': {
        if (!isLeader(user)) return Response.json({ error: 'Only a club admin can save the club profile' }, { status: 403 });
        const p = body.profile || {};
        const name = String(p.name || '').trim();
        if (!name) return Response.json({ error: 'Club name is required' }, { status: 400 });
        if (p.primary_color && !HEX.test(p.primary_color)) return Response.json({ error: 'Invalid primary color' }, { status: 400 });
        if (p.secondary_color && !HEX.test(p.secondary_color)) return Response.json({ error: 'Invalid secondary color' }, { status: 400 });
        if (!START_PATHS.includes(p.start_path)) return Response.json({ error: 'Choose how you want to start' }, { status: 400 });
        if (!['u_age', 'birth_year'].includes(p.age_group_convention)) return Response.json({ error: 'Choose an age-group convention' }, { status: 400 });
        const month = (m: any) => { const n = Number(m); return n >= 1 && n <= 12 ? n : undefined; };

        const update: any = {
          name, timezone: String(p.timezone || '').slice(0, 60), season_naming: String(p.season_naming || '').slice(0, 40),
          season_start_month: month(p.season_start_month), season_end_month: month(p.season_end_month),
          age_group_convention: p.age_group_convention, start_path: p.start_path,
          source_system: p.start_path === 'known_system' ? String(p.source_system || '').slice(0, 80) : (club.source_system || ''),
        };
        if (p.logo_url !== undefined) update.logo_url = String(p.logo_url || '');
        if (p.primary_color) update.primary_color = p.primary_color;
        if (p.secondary_color) update.secondary_color = p.secondary_color;
        await svc.entities.Club.update(clubId, update);

        const existing = await svc.entities.Location.filter({ club_id: clubId });
        const have = new Set(existing.map((l: any) => String(l.name || '').trim().toLowerCase()));
        const branches = (Array.isArray(p.branches) ? p.branches : []).slice(0, 30)
          .map((b: any) => ({ name: String(b?.name || '').trim().slice(0, 100), city: String(b?.city || '').trim().slice(0, 100) }))
          .filter((b: any) => b.name && !have.has(b.name.toLowerCase()));
        for (const b of branches) await svc.entities.Location.create({ club_id: clubId, name: b.name, city: b.city, is_active: true });

        const steps = { ...(journey.steps || {}) };
        steps.a_profile = { ...(steps.a_profile || {}), state: 'done', updated_at: now(), updated_by: user.email };
        if (p.start_path === 'fresh') {
          for (const k of ['b_import', 'b_signoff']) {
            steps[k] = { state: 'skipped', note: 'Started fresh, no import needed', updated_at: now(), updated_by: user.email };
          }
        }
        journey = await touch({ steps, draft: {}, start_path: p.start_path, source_system: update.source_system, current_stage: 'B', last_step_key: 'b_path' });
        await audit('journey_profile_saved', { start_path: p.start_path, branches_added: branches.length, age_group_convention: p.age_group_convention });
        return respond(journey, { ...club, ...update });
      }

      case 'sync_migration': {
        // Called by the Migration Wizard when the job status changes. Only updates
        // if a journey already exists — legacy clubs without one are left alone.
        if (!journey.last_active_at && !journey.steps?.a_profile) {
          return Response.json({ ok: false, no_journey: true });
        }
        const status = String(body.status || '');
        const IMPORT_DONE = ['client_review', 'support_review', 'completed'];
        const SIGNOFF_DONE = ['completed'];
        const steps = { ...(journey.steps || {}) };
        const patch = (key: string, state: string) => {
          const prev = steps[key] || { state: 'not_started' };
          if (prev.state === 'done' || prev.state === 'skipped') return; // don't downgrade a manual done/skip
          steps[key] = { ...prev, state, updated_at: now(), updated_by: user.email };
        };
        if (IMPORT_DONE.includes(status)) patch('b_import', 'done');
        if (SIGNOFF_DONE.includes(status)) patch('b_signoff', 'done');
        if (status === 'draft' && steps.b_import?.state === 'done') {
          // migration was reset to upload after reaching review — reopen the step
          steps.b_import = { ...steps.b_import, state: 'in_progress', updated_at: now(), updated_by: user.email };
        }
        journey = await touch({ steps, current_stage: 'B' });
        return respond(journey, club);
      }

      case 'sync_season': {
        // Validate Stage C readiness from live data and update journey steps.
        const [seasons, teams, players, platforms] = await Promise.all([
          svc.entities.Season.filter({ club_id: clubId }),
          svc.entities.Team.filter({ club_id: clubId }),
          svc.entities.Player.filter({ club_id: clubId }),
          svc.entities.Platform.filter({ club_id: clubId }),
        ]);
        const currentSeason = seasons.find((s: any) => s.is_current || s.status === 'active') || null;
        const activeTeams = teams.filter((t: any) => !['retired', 'skipped'].includes(t.status));
        const exceptions: string[] = Array.isArray(journey.steps?.c_teams?.exceptions) ? journey.steps.c_teams.exceptions : [];
        const noPlatform = activeTeams.filter((t: any) => !t.platform_id && !exceptions.includes(t.id));
        const noCoach = activeTeams.filter((t: any) => !t.coach_id && !(t.coach_ids?.length));
        const noTeam = players.filter((p: any) => !p.team_id);

        const steps = { ...(journey.steps || {}) };
        const patch = (key: string, state: string) => {
          const prev = steps[key] || { state: 'not_started' };
          if (['done', 'skipped'].includes(prev.state)) return;
          steps[key] = { ...prev, state, updated_at: now(), updated_by: user.email };
        };
        if (currentSeason?.status === 'active') patch('c_season', 'done');
        if (activeTeams.length > 0 && noPlatform.length === 0) patch('c_teams', 'done');
        if (activeTeams.length > 0 && noCoach.length === 0) patch('c_coaches', 'done');
        if (players.length === 0 || noTeam.length === 0) patch('c_rosters', 'done');

        journey = await touch({ steps, current_stage: 'C' });
        return Response.json({
          journey, club: clubView(club), can_edit: isLeader(user),
          readiness: {
            season: currentSeason ? { id: currentSeason.id, name: currentSeason.name, status: currentSeason.status } : null,
            team_count: activeTeams.length,
            platform_count: platforms.length,
            teams_without_platform: noPlatform.map((t: any) => ({ id: t.id, name: t.name, excepted: exceptions.includes(t.id) })),
            teams_without_coach: noCoach.map((t: any) => ({ id: t.id, name: t.name })),
            players_without_team: noTeam.length,
            can_activate: activeTeams.length > 0 && noPlatform.length === 0 && noTeam.length === 0,
          },
        });
      }

      case 'activate_season': {
        if (!isLeader(user)) return Response.json({ error: 'Only an admin can activate the season' }, { status: 403 });
        const [seasons, teams, players] = await Promise.all([
          svc.entities.Season.filter({ club_id: clubId }),
          svc.entities.Team.filter({ club_id: clubId }),
          svc.entities.Player.filter({ club_id: clubId }),
        ]);
        const activeTeams = teams.filter((t: any) => !['retired', 'skipped'].includes(t.status));
        const exceptions: string[] = Array.isArray(body.exceptions) ? body.exceptions : (journey.steps?.c_teams?.exceptions || []);
        const noPlatform = activeTeams.filter((t: any) => !t.platform_id && !exceptions.includes(t.id));
        const noTeam = players.filter((p: any) => !p.team_id);
        if (activeTeams.length === 0) return Response.json({ error: 'Create at least one team before activating the season' }, { status: 400 });
        if (noPlatform.length > 0) return Response.json({ error: `${noPlatform.length} team(s) are missing a platform` }, { status: 400 });
        if (noTeam.length > 0) return Response.json({ error: `${noTeam.length} player(s) are not assigned to a team` }, { status: 400 });

        const name = String(body.name || club.season_naming || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`).slice(0, 40);
        let season = seasons.find((s: any) => s.is_current || s.status === 'active');
        if (!season) {
          season = await svc.entities.Season.create({ club_id: clubId, name, status: 'active', is_current: true });
        } else {
          await svc.entities.Season.update(season.id, { status: 'active', is_current: true });
        }

        // Auto-create team chat and announcement channels for teams that lack them.
        const existingChannels = await svc.entities.Channel.filter({ club_id: clubId, scope: 'team' });
        const haveChannel = new Set(existingChannels.map((c: any) => c.team_id));
        let channelsCreated = 0;
        for (const t of activeTeams) {
          if (!haveChannel.has(t.id)) {
            await svc.entities.Channel.create({ club_id: clubId, team_id: t.id, team_name: t.name, name: `${t.name} — Team Chat`, type: 'team_chat', scope: 'team', allow_replies: true });
            await svc.entities.Channel.create({ club_id: clubId, team_id: t.id, team_name: t.name, name: `${t.name} — Announcements`, type: 'club_announcements', scope: 'team', allow_replies: false });
            channelsCreated += 2;
          }
        }

        const steps = { ...(journey.steps || {}) };
        steps.c_season = { ...(steps.c_season || {}), state: 'done', updated_at: now(), updated_by: user.email };
        journey = await touch({ steps, current_stage: 'C' });
        await audit('journey_step_changed', { step_key: 'c_season', to: 'done', detail: `Season "${name}" activated, ${activeTeams.length} teams, ${channelsCreated} channels created` });
        return respond(journey, club);
      }

      case 'team_exception': {
        if (!isLeader(user)) return Response.json({ error: 'Only an admin can grant exceptions' }, { status: 403 });
        const teamId = String(body.team_id || '');
        if (!teamId) return Response.json({ error: 'Team ID required' }, { status: 400 });
        const steps = { ...(journey.steps || {}) };
        const cTeams = steps.c_teams || { state: 'not_started' };
        const exceptions = Array.isArray(cTeams.exceptions) ? [...cTeams.exceptions] : [];
        const idx = exceptions.indexOf(teamId);
        if (idx >= 0) exceptions.splice(idx, 1); else exceptions.push(teamId);
        steps.c_teams = { ...cSteps, exceptions, updated_at: now(), updated_by: user.email };
        journey = await touch({ steps });
        return respond(journey, club);
      }

      case 'send_wave': {
        if (!isLeader(user)) return Response.json({ error: 'Only an admin can send invitations' }, { status: 403 });
        const wave = String(body.wave || '');
        if (!['directors', 'coaches', 'pilot', 'everyone'].includes(wave)) return Response.json({ error: 'Invalid wave' }, { status: 400 });
        const recipients: any[] = Array.isArray(body.recipients) ? body.recipients : [];
        if (recipients.length === 0) return Response.json({ error: 'No recipients selected' }, { status: 400 });

        let sent = 0;
        for (const r of recipients) {
          const email = String(r.email || '').trim().toLowerCase();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
          const existing = await svc.entities.ClubInvitation.filter({ club_id: clubId, email, status: 'pending' });
          if (existing.length > 0) continue;
          const token = crypto.randomUUID();
          const inv = await svc.entities.ClubInvitation.create({
            club_id: clubId, club_name: club.name, token, email,
            invitee_name: String(r.name || '').slice(0, 120),
            role: String(r.role || 'user').slice(0, 40),
            invited_by_name: user.full_name || user.email, invited_by_email: user.email,
            status: 'pending', sent_date: now(),
          });
          const url = `${appUrl()}/accept-invite?invite=${encodeURIComponent(token)}`;
          await sendBrandedEmail(base44, {
            to: email,
            subject: `You're invited to join ${club.name}`,
            html: `<p>Hi ${esc(r.name || '')},</p><p>You've been invited to join <strong>${esc(club.name)}</strong> on Club Rudder.</p><p><a href="${url}" style="display:inline-block;background:#399F7D;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Accept your invitation</a></p><p style="color:#64748b;font-size:14px;">This invitation was sent by ${esc(user.full_name || user.email)}.</p>`,
          }).catch((e: any) => console.error('Wave email failed:', e?.message));
          sent++;
        }

        const steps = { ...(journey.steps || {}) };
        steps[`d_wave_${wave}`] = { state: 'done', sent_count: sent, updated_at: now(), updated_by: user.email };
        const firstWave = !steps.d_wave || steps.d_wave.state !== 'done';
        steps.d_wave = { ...(steps.d_wave || {}), state: 'done', updated_at: now(), updated_by: user.email };
        if (firstWave && club.tenant_status !== 'live') {
          await svc.entities.Club.update(clubId, { tenant_status: 'live', go_live_date: now() });
          club.tenant_status = 'live';
          await logAudit(base44, { club_id: clubId, user, action: 'club_went_live', entity_type: 'Club', entity_id: clubId, metadata: { trigger: 'invitation_wave', wave } });
        }
        journey = await touch({ steps, current_stage: 'D' });
        await audit('journey_step_changed', { step_key: 'd_wave', to: 'done', wave, sent_count: sent });
        return respond(journey, club);
      }

      case 'wave_stats': {
        const invitations = await svc.entities.ClubInvitation.filter({ club_id: clubId });
        const stats = {
          total: invitations.length,
          pending: invitations.filter((i: any) => i.status === 'pending').length,
          accepted: invitations.filter((i: any) => i.status === 'accepted').length,
        };
        const waves: any = {};
        for (const w of ['directors', 'coaches', 'pilot', 'everyone']) {
          waves[w] = journey.steps?.[`d_wave_${w}`] || null;
        }
        return Response.json({ stats, waves });
      }

      case 'members': {
        const [users, invites] = await Promise.all([
          svc.entities.User.filter({ club_id: clubId }),
          svc.entities.ClubInvitation.filter({ club_id: clubId, status: 'pending' }),
        ]);
        const seen = new Set<string>();
        const members: any[] = [];
        for (const u of users) {
          const email = String(u.email || '').toLowerCase();
          if (email && !seen.has(email)) { seen.add(email); members.push({ email, name: u.full_name || email, role: u.custom_role || '' }); }
        }
        for (const i of invites) {
          const email = String(i.email || '').toLowerCase();
          if (email && !seen.has(email)) { seen.add(email); members.push({ email, name: i.invitee_name || email, role: i.role || '', pending: true }); }
        }
        return Response.json({ members });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('journey-action error:', error);
    return Response.json({ error: error.message || 'Journey action failed' }, { status: 500 });
  }
}