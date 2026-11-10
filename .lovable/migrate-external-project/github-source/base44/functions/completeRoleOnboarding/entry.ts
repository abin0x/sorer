import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getResendApiKey } from '../../shared/clubCredentials.ts';
import { sendInvitationEmail } from '../../shared/inviteEmail.ts';

// Completes the role-specific onboarding step for the current user: performs the
// role's side effects (creating child Player records, a Coach record, etc.), marks
// their UserRoles grant for that role as active, and reports whether another
// pending role's onboarding still needs to run.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });

    const body = await req.json();
    const role = String(body?.role || '').trim();
    const data = body?.data || {};
    if (!role) return Response.json({ error: 'role is required' }, { status: 400 });

    const pendingGrants = await base44.entities.UserRoles.filter({ user_id: user.id, club_id: user.club_id, role, status: 'pending' });
    const grant = pendingGrants?.[0];
    if (!grant) {
      return Response.json({ error: 'No pending onboarding found for this role.' }, { status: 404 });
    }

    const [firstName, ...rest] = (user.full_name || '').split(' ');
    const lastName = rest.join(' ') || '';

    if (role === 'parent_guardian') {
      // Find or create the Guardian record for this user
      const existingGuardians = await base44.entities.Guardian.filter({ club_id: user.club_id, user_id: user.id });
      let guardian = existingGuardians?.[0];
      if (!guardian) {
        guardian = await base44.entities.Guardian.create({
          club_id: user.club_id,
          user_id: user.id,
          first_name: firstName || user.full_name || 'Guardian',
          last_name: lastName,
          email: user.email,
          username: user.email,
          phone: data.phone || '',
          street_address: data.street_address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
        });
      }

      const children = Array.isArray(data.children) ? data.children : [];
      const newPlayerIds: string[] = [];
      for (const child of children) {
        if (!child?.first_name || !child?.last_name) continue;
        const player = await base44.entities.Player.create({
          club_id: user.club_id,
          first_name: child.first_name,
          last_name: child.last_name,
          date_of_birth: child.date_of_birth || undefined,
          guardian_id: guardian.id,
          guardian_name: `${guardian.first_name} ${guardian.last_name}`.trim(),
          guardian_ids: [guardian.id],
          team_id: child.team_id || undefined,
          status: 'pending',
        });
        newPlayerIds.push(player.id);
      }
      if (newPlayerIds.length > 0) {
        await base44.entities.Guardian.update(guardian.id, {
          player_ids: [...(guardian.player_ids || []), ...newPlayerIds],
        });
      }

      // Invite additional guardians (co-parents), non-blocking on individual failures
      const guardianInvites = Array.isArray(data.guardian_invites) ? data.guardian_invites : [];
      if (guardianInvites.length > 0) {
        const resendKey = await getResendApiKey(base44, user.club_id);
        if (resendKey) {
          const club = await base44.entities.Club.get(user.club_id);
          const clubName = club?.app_name || club?.name || 'Club Rudder OS';
          const fromAddress = (club?.resend_domain_status === 'verified' && club?.resend_domain_name)
            ? `${clubName} <invites@${club.resend_domain_name}>`
            : `${clubName} <onboarding@resend.dev>`;
          const appUrl = process.env.WIX_CHECKOUT_APP_URL || 'https://club-rudder-os.base44.app';
          for (const inv of guardianInvites) {
            if (!inv?.email) continue;
            await sendInvitationEmail(base44, {
              clubId: user.club_id,
              clubName,
              fromAddress,
              appUrl,
              resendKey,
              email: inv.email,
              fullName: inv.full_name || '',
              role: 'parent_guardian',
              accessLevel: inv.access_level === 'limited' ? 'limited' : 'full',
              invitedByName: user.full_name || user.email,
              invitedByEmail: user.email || '',
            });
          }
        }
      }
    } else if (role === 'coach') {
      const existingCoaches = await base44.entities.Coach.filter({ club_id: user.club_id, email: user.email });
      const teamId = data.team_id || '';
      let teamName = '';
      if (teamId) {
        try {
          const team = await base44.entities.Team.get(teamId);
          teamName = team?.name || '';
        } catch { /* ignore */ }
      }
      // Save emergency contact and preferences on user profile
      const coachProfile: any = {};
      if (data.phone) coachProfile.phone = data.phone;
      if (data.emergency_contact) coachProfile.emergency_contact = data.emergency_contact;
      if (data.preferred_age_groups) coachProfile.preferred_age_groups = data.preferred_age_groups;
      if (Object.keys(coachProfile).length > 0) {
        try { await base44.auth.updateMe(coachProfile); } catch { /* ignore */ }
      }
      const notesParts = [data.certifications || ''];
      if (data.license_number) notesParts.push(`License: ${data.license_number}`);
      const coachData = {
        club_id: user.club_id,
        first_name: firstName || user.full_name || 'Coach',
        last_name: lastName,
        email: user.email,
        phone: data.phone || '',
        ...(teamId ? { team_id: teamId, team_name: teamName } : {}),
        notes: notesParts.filter(Boolean).join('\n'),
        status: 'active',
      };
      if (existingCoaches?.[0]) {
        await base44.entities.Coach.update(existingCoaches[0].id, coachData);
      } else {
        await base44.entities.Coach.create(coachData);
      }
    } else if (role === 'branch_director') {
      if (data.branch_id) {
        await base44.entities.Location.update(data.branch_id, {
          branch_director_email: user.email,
          branch_director_name: user.full_name || '',
        });
      }
    } else if (role === 'bookkeeper') {
      if (data.stripe_account_id) {
        await base44.entities.Club.update(user.club_id, { stripe_account_id: data.stripe_account_id });
      }
    } else if (role === 'club_admin') {
      // Save phone/title on the user profile
      const profileUpdate: any = {};
      if (data.phone) profileUpdate.phone = data.phone;
      if (data.title) profileUpdate.title = data.title;
      if (Object.keys(profileUpdate).length > 0) {
        await base44.auth.updateMe(profileUpdate);
      }

      // Update club branding if provided
      if (data.club_branding?.primary_color) {
        try {
          const club = await base44.entities.Club.get(user.club_id);
          await base44.entities.Club.update(user.club_id, {
            primary_color: data.club_branding.primary_color,
            ...(data.club_branding.club_name ? { name: data.club_branding.club_name } : {}),
          });
        } catch { /* ignore club update errors */ }
      }

      // Create branches (Location records)
      const branches = Array.isArray(data.branches) ? data.branches : [];
      for (const branch of branches) {
        if (!branch?.name) continue;
        try {
          await base44.entities.Location.create({
            club_id: user.club_id,
            name: branch.name,
            city: branch.city || '',
            state: branch.state || '',
            branch_type: 'branch',
          });
        } catch { /* ignore individual branch errors */ }
      }

      // Create initial season if provided
      if (data.season?.name) {
        try {
          await base44.entities.Season.create({
            club_id: user.club_id,
            name: data.season.name,
            start_date: data.season.start_date || undefined,
            end_date: data.season.end_date || undefined,
            status: 'draft',
            is_current: false,
          });
        } catch { /* ignore season creation errors */ }
      }

      // Create a tryout plan if tryout date provided
      if (data.tryouts?.date) {
        try {
          const existingPlans = await base44.entities.TryoutPlan.filter({ club_id: user.club_id }, '-created_date', 1);
          if (!existingPlans?.[0]) {
            await base44.entities.TryoutPlan.create({
              club_id: user.club_id,
              name: 'Initial Tryout Plan',
              status: 'draft',
            });
          }
        } catch { /* ignore tryout plan errors */ }
      }
    } else if (role === 'platform_director') {
      if (data.platform_id) {
        try {
          const platform = await base44.entities.Platform.get(data.platform_id);
          const platformName = platform?.name || '';
          const existingAccess = await base44.entities.PlatformAccess.filter({ club_id: user.club_id, user_id: user.id, platform_id: data.platform_id });
          if (!existingAccess?.[0]) {
            await base44.entities.PlatformAccess.create({
              club_id: user.club_id,
              user_id: user.id,
              user_email: user.email,
              user_name: user.full_name || '',
              user_role: 'platform_director',
              platform_id: data.platform_id,
              platform_name: platformName,
              granted_by: user.email,
              granted_date: new Date().toISOString(),
            });
          }
        } catch { /* ignore platform lookup errors */ }
      }
    }
    // club_admin / club_director: contact info only, no extra entity side effects needed.

    await base44.entities.UserRoles.update(grant.id, {
      status: 'active',
      activated_date: new Date().toISOString(),
    });

    const stillPending = await base44.entities.UserRoles.filter({ user_id: user.id, club_id: user.club_id, status: 'pending' });
    const nextRole = stillPending?.[0]?.role || null;

    if (!nextRole) {
      await base44.auth.updateMe({ role_onboarding_completed: true });
    }

    return Response.json({ success: true, nextRole });
  } catch (error) {
    console.error('completeRoleOnboarding error:', error);
    return Response.json({ error: error.message || 'Failed to complete onboarding' }, { status: 500 });
  }
}