// @ts-nocheck
import { escapeHtml as e } from '@/lib/sanitizeHtml';
// Tryout confirmation email, sent through the app's branded Resend pipeline
// (the same one that mails invites, dues links and facility invoices) so a
// parent who has no app account still receives it.

import { sendBrandedEmail } from './resendEmail.ts';

const SESSION_LABEL: Record<string, string> = {
  main_tryout: 'Main Club Tryout',
  open_training: 'Open Training',
  supplemental_tryout: 'Supplemental Tryout',
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

export function buildTryoutConfirmationHtml({ registrations, sessions, plan, totals, appUrl }) {
  const rows = registrations
    .map((r) => {
      const session = sessions[r.tryout_event_id] || {};
      const status = r.status === 'waitlist' ? 'Waitlist' : 'Registered';
      const payment = r.payment_status === 'paid' ? `Paid ${money(r.amount_paid)}`
        : r.payment_status === 'waived' ? 'Fee waived'
          : r.payment_status === 'financial_aid_pending' ? 'Financial aid requested'
            : 'Payment pending';
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f3;">
          <div style="font-weight:600;color:#0f172a;">${e(r.player_name)}</div>
          <div style="font-size:13px;color:#64748b;">${SESSION_LABEL[session.type] || 'Session'} · ${session.date || ''}${session.start_time ? ` at ${e(session.start_time)}` : ''}${session.field_name ? ` · ${e(session.field_name)}` : ''}</div>
          <div style="font-size:13px;color:#64748b;">${status} · ${payment}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f3;text-align:right;font-size:13px;color:#0f172a;">${e(r.check_in_code || '')}</td>
      </tr>`;
    })
    .join('');

  const totalRow = totals.total > 0
    ? `<p style="font-size:14px;color:#334155;margin:16px 0 0;">Total charged: <strong>${money(totals.total)}</strong>${totals.discount > 0 ? ` (a ${money(totals.discount)} discount was applied)` : ''}</p>`
    : `<p style="font-size:14px;color:#334155;margin:16px 0 0;">No payment is due for this registration.</p>`;

  return `
  <p style="font-size:15px;color:#334155;margin:0 0 12px;">Your family is signed up for the ${e(plan?.title || 'tryout')}. Here is everything we have on file.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef0f3;border-radius:10px;overflow:hidden;">
    ${rows}
  </table>
  ${totalRow}
  <p style="font-size:15px;color:#334155;margin:20px 0 0;">Bring the check-in code above (or the QR code on your confirmation page) on the day. You can view your status, change a session or cancel any time before the change deadline:</p>
  <p style="margin:10px 0 0;"><a href="${appUrl}/TryoutStatus?club=${encodeURIComponent(plan?.club_id || '')}" style="color:#5048e5;font-weight:600;">View your tryout registration</a></p>`;
}

export async function sendTryoutConfirmation(base44, opts) {
  const subject = opts.registrations.length > 1
    ? `Tryout registration confirmed for ${opts.registrations.length} players`
    : `Tryout registration confirmed for ${opts.registrations[0]?.player_name || 'your player'}`;

  return sendBrandedEmail(base44, {
    to: opts.email,
    subject,
    html: buildTryoutConfirmationHtml(opts),
  });
}

// ================= Roster offers =================

/** "Sat, Aug 3 at 5:00 PM EDT" — an offer deadline a parent can act on. */
export function formatOfferExpiry(iso: any, timeZone = 'America/New_York') {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const options: any = {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  };
  try {
    return date.toLocaleString('en-US', { ...options, timeZone: timeZone || 'America/New_York' });
  } catch {
    return date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
}

/** The offer email: which team, what it costs, when it lapses, how to answer. */
export function buildOfferHtml({ playerName, teamName, planTitle, feesDue, feeNote, expiresAt, respondUrl, clubName }) {
  const fee = Number(feesDue || 0);
  const feeBlock = fee > 0
    ? `<p style="font-size:15px;color:#334155;margin:0 0 4px;"><strong>Fees due: $${fee.toFixed(2)}</strong></p>
       ${feeNote ? `<p style="font-size:13px;color:#64748b;margin:0;">${e(feeNote)}</p>` : ''}`
    : `<p style="font-size:15px;color:#334155;margin:0;"><strong>No fee is due for this offer.</strong></p>`;

  return `
  <p style="font-size:15px;color:#334155;margin:0 0 14px;">
    Good news — ${e(clubName || 'your club')} would like to offer ${e(playerName)} a place on <strong>${e(teamName)}</strong>${planTitle ? ` from the ${e(planTitle)}` : ''}.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef0f3;border-radius:10px;overflow:hidden;margin-bottom:18px;">
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #eef0f3;">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">Team</div>
        <div style="font-size:16px;font-weight:700;color:#0f172a;">${e(teamName)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #eef0f3;">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">Fees due on acceptance</div>
        ${feeBlock}
      </td>
    </tr>
    <tr>
      <td style="padding:12px 14px;">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">Please respond by</div>
        <div style="font-size:15px;color:#0f172a;"><strong>${formatOfferExpiry(expiresAt)}</strong></div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">
          After that the spot passes to the next player on the waiting list.
        </div>
      </td>
    </tr>
  </table>
  <p style="font-size:15px;color:#334155;margin:0 0 10px;"><strong>Accept</strong> to lock in the spot and start final registration, or <strong>decline</strong> to release it. You can also ask the club a question by replying to this email.</p>
  <p style="margin:0;"><a href="${respondUrl}" style="display:inline-block;background:#5048e5;color:#ffffff;font-weight:700;padding:13px 26px;border-radius:10px;text-decoration:none;">View the offer and respond</a></p>
  <p style="font-size:13px;color:#64748b;margin:16px 0 0;">If the button doesn't work, open this link: <a href="${respondUrl}" style="color:#5048e5;">${respondUrl}</a></p>`;
}

export async function sendTryoutOfferEmail(base44, { to, offer, team, plan, respondUrl }) {
  const teamName = offer?.team_name || team?.name || 'the team';
  const branding = await getClubBranding(base44);
  const subject = offer?.status === 'accepted'
    ? `${offer.player_name}: welcome to ${teamName}`
    : `Roster offer for ${offer?.player_name || 'your player'} — ${teamName}`;
  return sendBrandedEmail(base44, {
    to,
    subject,
    html: buildOfferHtml({
      playerName: offer?.player_name,
      teamName,
      planTitle: plan?.title || '',
      feesDue: offer?.fee_amount || 0,
      feeNote: offer?.fee_note || '',
      expiresAt: offer?.expires_at,
      respondUrl,
      clubName: branding.club_name,
    }),
  });
}

/** A plain, honest note to families — non-selection notices and thank-yous. */
export async function sendTryoutNoticeEmail(base44, { to, subject, body, html }) {
  const content = html || `<div style="color:#334155;font-size:15px;line-height:1.7;white-space:pre-wrap;">${String(body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`;
  return sendBrandedEmail(base44, { to, subject, html: content });
}