import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

// Admin-only: sends a dues payment link email to a specific player/family.
// Ensures a dues Offer exists for the team plan before sending.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { team_plan_id, email, player_name } = body;

    if (!team_plan_id || !email) {
      return Response.json({ error: 'Missing team_plan_id or email' }, { status: 400 });
    }

    const plan = await svc.entities.TeamPlan.get(team_plan_id).catch(() => null);
    if (!plan) return Response.json({ error: 'Team plan not found' }, { status: 404 });

    const club = await svc.entities.Club.get(plan.club_id).catch(() => null);
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    // Ensure a dues Offer exists — create one if missing
    let offer: any = null;
    if (plan.offer_id) {
      offer = await svc.entities.Offer.get(plan.offer_id).catch(() => null);
    }
    if (!offer) {
      offer = await svc.entities.Offer.create({
        club_id: plan.club_id,
        name: `${plan.team_name} — ${plan.season || 'Season'} Dues`,
        description: `Yearly club dues for ${plan.team_name}${plan.age_group ? ` (${plan.age_group})` : ''}.`,
        type: 'dues',
        access: 'members_only',
        status: 'active',
        sort_order: 0,
        config: {
          amount: Number(plan.club_dues) || 0,
          payment_plans: plan.payment_plans || ['full', 'monthly'],
          season: plan.season,
          team_id: plan.team_id || '',
          team_name: plan.team_name,
          cover_fee_option: true,
          fee_percent: 2.9,
        },
      });
      await svc.entities.TeamPlan.update(plan.id, { offer_id: offer.id });
    }

    const appUrl = req.headers.get('X-Base44-App-Url') || 'https://clubrudder.com';
    const base = appUrl.replace(/\/$/, '');
    if (!base) return Response.json({ error: 'Could not determine app URL' }, { status: 500 });

    const payUrl = `${base}/PayDues?offer=${offer.id}&club=${club.slug || club.id}`;
    const amount = Number(offer.config?.amount || plan.club_dues || 0);

    const html = `
      <p>Hi ${player_name || 'there'},</p>
      <p>Congratulations on making the <strong>${plan.team_name}</strong> roster${plan.season ? ` for the ${plan.season} season` : ''}!</p>
      <p>Your yearly club dues are <strong>$${amount.toFixed(2)}</strong>.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${payUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:16px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">Pay Dues — $${amount.toFixed(2)}</a>
      </div>
      <p style="color:#64748b;font-size:13px;">Or copy and paste this link into your browser:<br/>${payUrl}</p>
      <p style="color:#64748b;font-size:13px;margin-top:20px;">If you have any questions, please contact ${club.name} directly.</p>
    `;

    await sendBrandedEmail(base44, {
      to: email,
      subject: `${club.name} — ${plan.team_name} Dues${plan.season ? ` (${plan.season})` : ''}`,
      html,
      from_name: club.name,
    });

    return Response.json({ success: true, pay_url: payUrl });
  } catch (error) {
    console.error('send-dues-link error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}