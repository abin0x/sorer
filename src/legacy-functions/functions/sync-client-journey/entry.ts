// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

// Upserts the status-sheet record (ClientJourney) for a prospect from a new
// DemoAccessRequest or TrialSignups record, and sends a one-time confirmation
// email for the resulting stage. Called by the "Demo Request Journey Sync"
// and "Trial Signup Journey Sync" workflows on entity create.
const STAGE_ORDER = ['lead', 'demo_booked', 'demo_held', 'trial_active', 'agreement_signed', 'paid', 'migrating', 'live', 'active', 'renewal_due'];
const rank = (s) => STAGE_ORDER.indexOf(s);

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, email, name, club_name, branch_count, sport, user_id, club_id, trial_end_date } = body;
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const existingMatches = await svc.entities.ClientJourney.filter({ contact_email: email });
    const existing = existingMatches?.[0] || null;

    const targetStage = type === 'trial' ? 'trial_active' : 'demo_booked';
    const stage = existing && rank(existing.stage) > rank(targetStage) ? existing.stage : targetStage;

    let contactName = name || existing?.contact_name || '';
    if (type === 'trial' && user_id && !contactName) {
      try {
        const u = await svc.entities.User.get(user_id);
        contactName = u?.full_name || '';
      } catch (e) { /* best-effort */ }
    }

    const patch = {
      contact_name: contactName,
      contact_email: email,
      club_name: club_name || existing?.club_name || '',
      branch_count: branch_count || existing?.branch_count || '',
      source: existing?.source || (type === 'trial' ? 'trial' : 'demo'),
      stage,
    };
    if (type === 'demo') {
      patch.demo_date = new Date().toISOString();
    } else {
      patch.trial_start_date = new Date().toISOString();
      if (trial_end_date) patch.trial_end_date = trial_end_date;
      if (sport) patch.sport = sport;
      if (user_id) patch.user_id = user_id;
      if (club_id) patch.club_id = club_id;
    }

    let journey;
    if (existing) {
      journey = await svc.entities.ClientJourney.update(existing.id, patch);
    } else {
      journey = await svc.entities.ClientJourney.create(patch);
    }

    // Send a one-time confirmation email for this stage transition.
    if (!existing || existing.last_email_stage !== stage) {
      const subject = type === 'trial' ? 'Welcome to your Club Rudder trial' : 'Your Club Rudder demo request';
      const emailHtml = type === 'trial'
        ? `Hi ${contactName || 'there'},<br/><br/>Your 30-day trial for ${patch.club_name || 'your club'} is live. Here's your 5-step checklist to get the most out of it:<br/><br/>1. Connect payments in test mode<br/>2. Create a fee<br/>3. Create an event<br/>4. Invite a coach<br/>5. Preview the family app<br/><br/>We'll check in along the way \u2014 reach out any time if you have questions.`
        : `Hi ${contactName || 'there'},<br/><br/>Thanks for requesting a demo for ${patch.club_name || 'your club'}. We'll be in touch shortly to schedule a time, and you'll get reminders 24 hours and 1 hour before the call.`;
      try {
        await sendBrandedEmail(base44, { to: email, subject, html: emailHtml });
      } catch (e) {
        console.error('sync-client-journey: email send failed', e);
      }
      await svc.entities.ClientJourney.update(journey.id, { last_email_stage: stage });
    }

    return Response.json({ ok: true, journey_id: journey.id, stage });
  } catch (error) {
    console.error('sync-client-journey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}