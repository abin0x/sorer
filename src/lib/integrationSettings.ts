import { isEchelonKey } from './paymentPreference';

export type ProviderKey =
  | 'stripe' | 'echelon' | 'square' | 'paypal' | 'custom_gateway' | 'quickbooks' | 'resend'
  | 'google_calendar' | 'google_maps' | 'facebook' | 'instagram' | 'x' | 'youtube' | 'linkedin';

export type FieldDef = { name: string; label: string; secret?: boolean; placeholder?: string; optional?: boolean; options?: string[] };

export type ProviderDef = {
  key: ProviderKey; name: string; category: 'Payments' | 'Accounting' | 'Email' | 'Google' | 'Social';
  blurb: string; mode: 'stripe' | 'oauth' | 'manual'; fields?: FieldDef[];
};

const ENV: FieldDef = { name: 'environment', label: 'Environment', options: ['production', 'sandbox'] };

export const INTEGRATION_PROVIDERS: ProviderDef[] = [
  { key: 'stripe', name: 'Stripe', category: 'Payments', mode: 'stripe', blurb: 'Collect dues and fees straight into your club’s own Stripe account.' },
  { key: 'echelon', name: 'Echelon', category: 'Payments', mode: 'manual', blurb: 'Take card and ACH payments through your club’s Echelon merchant account.', fields: [
    { name: 'security_key', label: 'Gateway security key', secret: true, placeholder: '32 letters and numbers' }] },
  { key: 'square', name: 'Square', category: 'Payments', mode: 'manual', blurb: 'Take card payments through your club’s Square account.', fields: [
    { name: 'access_token', label: 'Access token', secret: true, placeholder: 'EAAA…' },
    { name: 'location_id', label: 'Location ID', placeholder: 'L…', optional: true }, ENV] },
  { key: 'paypal', name: 'PayPal', category: 'Payments', mode: 'manual', blurb: 'Let families pay with PayPal or Venmo.', fields: [
    { name: 'client_id', label: 'Client ID', placeholder: 'A…' },
    { name: 'client_secret', label: 'Secret', secret: true }, ENV] },
  { key: 'custom_gateway', name: 'Other payment gateway', category: 'Payments', mode: 'manual', blurb: 'Any other processor your club already uses, set up by hand.', fields: [
    { name: 'gateway_name', label: 'Gateway name', placeholder: 'e.g. Authorize.net' },
    { name: 'api_base_url', label: 'API address', placeholder: 'https://api.example.com' },
    { name: 'api_key', label: 'API key', secret: true },
    { name: 'api_secret', label: 'API secret', secret: true, optional: true },
    { name: 'webhook_secret', label: 'Webhook signing secret', secret: true, optional: true }] },
  { key: 'quickbooks', name: 'QuickBooks', category: 'Accounting', mode: 'oauth', blurb: 'Sync payments and expenses into your club’s books.' },
  { key: 'resend', name: 'Resend', category: 'Email', mode: 'manual', blurb: 'Send invites and announcements from your club’s own email address.', fields: [
    { name: 'api_key', label: 'API key', secret: true, placeholder: 're_…' },
    { name: 'from_email', label: 'Send from address', placeholder: 'hello@yourclub.com' }] },
  { key: 'google_calendar', name: 'Google Calendar', category: 'Google', mode: 'oauth', blurb: 'Publish practices and games to your club calendar.' },
  { key: 'google_maps', name: 'Google Maps', category: 'Google', mode: 'manual', blurb: 'Show field maps and directions for your venues.', fields: [
    { name: 'api_key', label: 'Maps API key', secret: true, placeholder: 'AIza…' }] },
  { key: 'facebook', name: 'Facebook', category: 'Social', mode: 'oauth', blurb: 'Post news to your club’s Facebook Page.' },
  { key: 'instagram', name: 'Instagram', category: 'Social', mode: 'oauth', blurb: 'Share photos and results to your Instagram business account.' },
  { key: 'x', name: 'X (Twitter)', category: 'Social', mode: 'oauth', blurb: 'Post scores and updates to your club’s X account.' },
  { key: 'youtube', name: 'YouTube', category: 'Social', mode: 'oauth', blurb: 'Upload highlights to your club’s YouTube channel.' },
  { key: 'linkedin', name: 'LinkedIn', category: 'Social', mode: 'oauth', blurb: 'Share club news with sponsors and partners.' },
];

export const PROVIDER_KEYS = INTEGRATION_PROVIDERS.map((p) => p.key) as [ProviderKey, ...ProviderKey[]];

export function canManageIntegrations(role: string) {
  return role === 'owner' || role === 'admin';
}

const HOSTS: Record<string, string[]> = {
  stripe: ['connect.stripe.com'], quickbooks: ['appcenter.intuit.com'],
  google_calendar: ['accounts.google.com'], youtube: ['accounts.google.com'],
  facebook: ['www.facebook.com'], instagram: ['www.facebook.com'],
  x: ['twitter.com', 'x.com'], linkedin: ['www.linkedin.com'],
};

export function safeOAuthRedirect(provider: string, raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('Connection could not be started.');
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || !HOSTS[provider]?.includes(url.hostname)) {
    throw new Error('Invalid connection destination.');
  }
  return url.toString();
}

/** Validates manual credential fields; returns cleaned values or an error message (never echoes values). */
export function validateManualFields(provider: ProviderKey, input: Record<string, unknown>): { ok: true; values: Record<string, string> } | { ok: false; error: string } {
  const def = INTEGRATION_PROVIDERS.find((p) => p.key === provider);
  if (!def || def.mode !== 'manual') return { ok: false, error: 'This connection is not set up manually.' };
  const values: Record<string, string> = {};
  for (const f of def.fields ?? []) {
    const v = typeof input[f.name] === 'string' ? (input[f.name] as string).trim() : '';
    if (!v && !f.optional) return { ok: false, error: `${f.label} is required.` };
    if (v.length > 500) return { ok: false, error: `${f.label} is too long.` };
    if (v && f.options && !f.options.includes(v)) return { ok: false, error: `${f.label} is not valid.` };
    if (v) values[f.name] = v;
  }
  if (provider === 'resend') {
    if (!/^re_[A-Za-z0-9_]{10,200}$/.test(values['api_key'] ?? '')) return { ok: false, error: 'That doesn’t look like a Resend API key (it starts with re_).' };
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(values['from_email'] ?? '')) return { ok: false, error: 'Enter a valid send-from email address.' };
  }
  if (provider === 'echelon' && !isEchelonKey(values['security_key'] ?? '')) return { ok: false, error: 'An Echelon security key is 32 letters and numbers.' };
  if (provider === 'custom_gateway') {
    let u: URL | null = null;
    try { u = new URL(values['api_base_url'] ?? ''); } catch { /* invalid */ }
    if (!u || u.protocol !== 'https:' || u.username || u.password) return { ok: false, error: 'The API address must start with https://.' };
  }
  if (provider === 'google_maps' && !/^AIza[0-9A-Za-z_-]{20,}$/.test(values['api_key'] ?? '')) return { ok: false, error: 'That doesn’t look like a Google Maps key (it starts with AIza).' };
  return { ok: true, values };
}
