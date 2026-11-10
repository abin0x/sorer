import Stripe from 'stripe';

export interface StripeConnectionLookup {
  id: string;
  club_id: string;
  external_account_id: string;
}

export function stripeTenantClient(platformKey: string, connection: StripeConnectionLookup) {
  if (!/^acct_[A-Za-z0-9]+$/.test(connection.external_account_id)) {
    throw new Error('Stripe connection unavailable.');
  }
  const stripe = new Stripe(platformKey, { httpClient: Stripe.createFetchHttpClient() });
  // Obtain connection from a stored, authorized record, never a client account ID.
  return {
    stripe,
    options: { stripeAccount: connection.external_account_id },
  };
}

export async function verifyStripeEvent(raw: string, signature: string, signingSecret: string) {
  // Signature verification needs no API credential and runs before privileged reads.
  const stripe = new Stripe('signature-verification-only', { httpClient: Stripe.createFetchHttpClient() });
  return stripe.webhooks.constructEventAsync(
    raw, signature, signingSecret, 300, Stripe.createSubtleCryptoProvider(),
  );
}

export function stripeEventAccount(event: { account?: string; data?: unknown }) {
  return event.account && /^acct_[A-Za-z0-9]+$/.test(event.account) ? event.account : null;
}