// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clubName, branchCount, sport, inviteEmails } = body;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!clubName) return Response.json({ error: 'Club name is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const slugBase = clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${slugBase || 'club'}-${now.getTime().toString(36)}`;

    // Create the trial club
    const club = await svc.entities.Club.create({
      name: clubName,
      slug,
      club_type: 'trial',
      status: 'trialing',
      plan_tier: 'starter',
      trial_ends_at: trialEnd,
      onboarded_by_user_id: user.id,
      primary_contact_email: user.email,
      primary_contact_name: user.full_name || '',
      billing_email: user.email,
      max_branches: branchCount === '1' ? 1 : branchCount === '2-5' ? 5 : branchCount === '6-10' ? 10 : 20,
    });

    // Stamp the user with their new club + admin role
    await base44.auth.updateMe({ club_id: club.id, custom_role: 'club_admin' });

    // Create the TrialSignups record (triggers the nurture workflow)
    await svc.entities.TrialSignups.create({
      email: user.email,
      user_id: user.id,
      club_id: club.id,
      club_name: clubName,
      branch_count: branchCount || '1',
      sport: sport || '',
      signup_date: now.toISOString(),
      trial_end_date: trialEnd,
      status: 'Trial',
      invited_emails: Array.isArray(inviteEmails) ? inviteEmails : [],
    });

    // Update the matching DemoAccessRequest to "trial_in_progress" so the
    // system owner can track which invites converted into actual trials.
    try {
      const demoReqs = await svc.entities.DemoAccessRequest.filter({ email: user.email });
      const demoReq = (demoReqs || []).find((r) => r.status !== 'denied' && r.access_token);
      if (demoReq) {
        await svc.entities.DemoAccessRequest.update(demoReq.id, {
          status: 'trial_in_progress',
          trial_club_id: club.id,
          trial_club_name: clubName,
          trial_started_date: now.toISOString(),
        });
      }
    } catch { /* best-effort tracking */ }

    // Send optional invites (best-effort)
    if (Array.isArray(inviteEmails) && inviteEmails.length > 0) {
      for (const email of inviteEmails.slice(0, 10)) {
        if (!email) continue;
        try {
          await sendBrandedEmail(base44, {
            to: email,
            subject: `${user.full_name || 'Your colleague'} invited you to ${clubName} on ClubRudder`,
            body: `You've been invited to join ${clubName} on ClubRudder. Click the link to get started and help run the club this season.`,
          });
        } catch (e) {
          // best-effort — don't fail the trial if an invite email bounces
        }
      }
    }

    return Response.json({ club_id: club.id, trial_ends_at: trialEnd });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}