// @ts-nocheck
// Shared helper: reads the club's stored integration credentials from
// ClubCredential (admin-only entity, accessed via asServiceRole).
// Returns { stripe_secret_key, stripe_publishable_key, resend_api_key,
//   quickbooks_client_id, quickbooks_client_secret } or null if no record exists.
export async function getClubCredentials(base44, clubId) {
  if (!clubId) return null;
  try {
    const existing = await base44.asServiceRole.entities.ClubCredential.filter({ club_id: clubId });
    return existing?.[0] || null;
  } catch (e) {
    console.error('getClubCredentials error:', e);
    return null;
  }
}

// Per-tenant mode: each club uses its own stored credentials, with a fallback
// to the platform-level RESEND_API_KEY env var so invitations and transactional
// emails still work for clubs that haven't set up their own Resend domain yet.
export async function getResendApiKey(base44, clubId) {
  const cred = await getClubCredentials(base44, clubId);
  return cred?.resend_api_key || process.env.RESEND_API_KEY || null;
}

export async function getStripeSecretKey(base44, clubId) {
  const cred = await getClubCredentials(base44, clubId);
  return cred?.stripe_secret_key || null;
}

export async function getQuickBooksOAuthCredentials(base44, clubId) {
  const cred = await getClubCredentials(base44, clubId);
  return {
    clientId: cred?.quickbooks_client_id || null,
    clientSecret: cred?.quickbooks_client_secret || null,
  };
}