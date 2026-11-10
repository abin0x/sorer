// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { logAudit } from '../../shared/auditLog.ts';

// Stripe redirects here after the club admin completes (or abandons) onboarding.
// We verify the account belongs to the current user's club, then redirect back
// to the Connections page with a success/failure flag.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const accountId = url.searchParams.get('account_id');

    const appUrl =
      req.headers.get('X-Base44-App-Url') ||
      process.env.WIX_CHECKOUT_APP_URL ||
      '';
    const redirectTarget = appUrl ? `${appUrl.replace(/\/$/, '')}/Connections` : '/Connections';

    if (!accountId) return htmlResponse('Missing account ID.', false, redirectTarget);

    const user = await base44.auth.me();
    if (!user) return htmlResponse('You must be signed in to complete Stripe connection.', false, redirectTarget);
    if (!user.club_id) return htmlResponse('No club associated with your account.', false, redirectTarget);

    // Verify the account belongs to this club (multi-tenant isolation)
    const club = await base44.asServiceRole.entities.Club.get(user.club_id);
    if (!club || club.stripe_account_id !== accountId) {
      return htmlResponse('Account mismatch — connection refused.', false, redirectTarget);
    }

    // Optionally verify the account status with Stripe
    const secretKey = process.env.STRIPE_SECRET_KEY;
    let detailsSubmitted = false;
    if (secretKey) {
      try {
        const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const acct = await acctRes.json().catch(() => ({}));
        if (acctRes.ok) {
          detailsSubmitted = !!acct.details_submitted;
        }
      } catch (e) {
        console.error('stripe account fetch failed:', e);
      }
    }

    if (detailsSubmitted) {
      await logAudit(base44, {
        club_id: user.club_id,
        user,
        action: 'stripe_connected',
        entity_type: 'Club',
        entity_id: user.club_id,
        metadata: { account_id: accountId },
      });
    }

    const message = detailsSubmitted
      ? 'Stripe account connected successfully! Redirecting back to your connections page…'
      : 'Onboarding saved. You can complete your Stripe setup later from the Connections page. Redirecting…';
    return htmlResponse(message, true, redirectTarget);
  } catch (error) {
    console.error('stripe-connect-callback error:', error);
    return htmlResponse(`Connection failed: ${error.message}`, false, '/Connections');
  }
}

function htmlResponse(message: string, success: boolean, redirectUrl: string): Response {
  const color = success ? '#059669' : '#dc2626';
  const title = success ? 'Connected' : 'Connection Failed';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Stripe Connection</title>
<meta http-equiv="refresh" content="2;url=${redirectUrl}">
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc}
div{text-align:center;padding:2rem 2.5rem;border-radius:14px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.08);max-width:420px}
h2{color:${color};margin:0 0 .5rem;font-size:1.25rem}p{color:#475569;font-size:.875rem;margin:.25rem 0}</style></head>
<body><div><h2>${success ? '✓' : '✕'} ${title}</h2><p>${message}</p>
<p style="margin-top:1rem;font-size:.75rem;color:#94a3b8">Redirecting back…</p>
<script>setTimeout(function(){window.location.href='${redirectUrl}';},2000);</script>
</div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}