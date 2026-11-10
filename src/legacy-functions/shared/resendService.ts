// @ts-nocheck
// Server-side Resend SDK wrapper. Never expose the API key to the client.
// All Resend calls go through this service.

import { Resend } from '@/legacy-functions/_resend';

async function withRetry(fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      // Resend SDK returns { data, error } — does NOT throw on API errors.
      if (result?.error) throw new Error(result.error.message || 'Resend API error');
      return result;
    } catch (err) {
      lastError = err;
      const is5xx = err?.statusCode >= 500 || err?.status >= 500;
      if (attempt < maxAttempts && is5xx) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export function createResendService(apiKey) {
  const resend = new Resend(apiKey);

  return {
    async sendEmail({ to, from, subject, html, text, replyTo, headers, tags }) {
      return withRetry(() => resend.emails.send({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to: replyTo,
        headers,
        tags,
      }));
    },

    async listDomains() {
      return withRetry(() => resend.domains.list());
    },

    async getDomain(domainId) {
      return withRetry(() => resend.domains.get(domainId));
    },

    async createDomain(name) {
      return withRetry(() => resend.domains.create({ name, region: 'us-east-1' }));
    },

    async verifyDomain(domainId) {
      return withRetry(() => resend.domains.verify(domainId));
    },

    /** Raw API call for domain status via fetch (SDK may not expose all fields). */
    async getDomainStatus(domainName) {
      const resp = await fetch(`https://api.resend.com/domains`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) throw new Error(`Resend domains list failed: ${resp.status}`);
      const data = await resp.json();
      const domains = data?.data || [];
      return domains.find(d => d.name === domainName) || null;
    },
  };
}

/** Test that the API key is valid by listing domains. */
export async function testResendConnection(apiKey) {
  try {
    const resp = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) return { success: true, message: 'Connection successful' };
    const body = await resp.text();
    return { success: false, message: `Resend API error: ${resp.status} — ${body.slice(0, 200)}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}