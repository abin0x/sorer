// Shared helper: loads platform branding from AppConfig and sends a branded
// email through Resend using the platform RESEND_API_KEY (not the built-in
// Core.SendEmail, which is branded "Base44"). Used by sendEmail and
// send-trial-email so all outgoing mail is consistently branded as ClubRudder.

import { Resend } from 'npm:resend@3.2.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const DEFAULT_BRANDING = {
  club_name: 'ClubRudder',
  club_tagline: 'Multi-Club Operations Platform',
  logo_url: '',
  primary_color: '#4f46e5',
  accent_color: '#0ea5e9',
  sending_domain: 'clubrudder.com',
};

/** Load club/system identity (name, tagline, logo, colors) from AppConfig. */
export async function getClubBranding(base44) {
  try {
    const rows = await base44.entities.AppConfig.filter({ config_key: 'system_theme' });
    const row = rows?.[0];
    if (row?.config_value) {
      return { ...DEFAULT_BRANDING, ...row.config_value };
    }
  } catch (e) {
    // fall through to defaults
  }
  return DEFAULT_BRANDING;
}

/** Wrap plain text or simple HTML in a branded email template. */
export function brandEmail(content, branding, subject) {
  const { club_name, logo_url, primary_color, accent_color, club_tagline } = branding;
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  const bodyHtml = isHtml
    ? content
    : `<div style="color:#334155;font-size:15px;line-height:1.7;white-space:pre-wrap;">${content}</div>`;

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f6f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e8e8;">
        <tr>
          <td style="background:linear-gradient(135deg,${primary_color},${primary_color}dd);padding:28px 32px;">
            <table width="100%"><tr>
              <td style="vertical-align:middle;">
                <table cellpadding="0" cellspacing="0"><tr>
                  ${logo_url
                    ? `<td style="width:48px;"><img src="${logo_url}" alt="${club_name}" style="height:40px;width:auto;border-radius:8px;background:#fff;padding:4px;"/></td>`
                    : `<td style="width:48px;"><div style="width:40px;height:40px;background:#fff;border-radius:10px;text-align:center;line-height:40px;font-weight:800;color:${primary_color};font-size:18px;">${club_name?.[0] || 'C'}</div></td>`}
                  <td style="padding-left:14px;">
                    <div style="color:#fff;font-size:20px;font-weight:800;">${club_name}</div>
                    <div style="color:#ffffffcc;font-size:12px;">${club_tagline || ''}</div>
                  </td>
                </tr></table>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <h2 style="color:${primary_color};margin:0 0 16px;font-size:18px;">${subject}</h2>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:${accent_color}11;padding:16px 32px;border-top:1px solid #eee;">
            <p style="color:#64748b;font-size:11px;margin:0;">This message was sent by ${club_name}. Manage your notification preferences in the app.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Send a branded email via Resend. Loads branding, wraps the body, and sends.
 * @param base44 - the SDK client (used to load branding)
 * @param { to, subject, body, text, html, from_name }
 *   body = plain text (auto-wrapped), html = pre-built HTML (wrapped in shell),
 *   text = optional plain-text alternative
 */
export async function sendBrandedEmail(base44, { to, subject, body, text, html, from_name, attachments }) {
  const branding = await getClubBranding(base44);
  const rawContent = html || body || text || '';
  const brandedHtml = brandEmail(rawContent, branding, subject);
  const fromName = from_name || branding.club_name || 'ClubRudder';
  const recipients = Array.isArray(to) ? to : [to];

  // Send via Resend using the verified clubrudder.com domain so all emails
  // come from welcome@clubrudder.com (never from the platform's
  // no-reply@base44-apps.com address).
  try {
    const result = await resend.emails.send({
      from: `${fromName} <welcome@clubrudder.com>`,
      to: recipients,
      subject,
      html: brandedHtml,
      text: text || undefined,
      // Optional [{ filename, content }] where content is base64 — used to attach
      // generated PDFs (e.g. facility invoices).
      ...(Array.isArray(attachments) && attachments.length ? { attachments } : {}),
    });
    // Resend SDK returns { data, error } — does NOT throw on API errors.
    // Check for the error field so callers know the send failed.
    if (result?.error) {
      throw new Error(result.error.message || 'Resend send failed');
    }
    return result;
  } catch (err) {
    console.error('Resend send failed:', err);
    throw err;
  }
}