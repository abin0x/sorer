// @ts-nocheck
export function interpolateEmail(value, variables) {
  return String(value || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    const result = key.split('.').reduce((object, part) => object?.[part], variables);
    if (result === undefined || result === null) return match;
    return String(result).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  });
}

export async function resolveEditableEmail(base44, clubId, type, defaults, variables) {
  const rows = await base44.asServiceRole.entities.EmailTemplate.filter({ club_id: clubId || null, template_type: type });
  const template = rows[0] || await base44.asServiceRole.entities.EmailTemplate.create({
    club_id: clubId || null, template_type: type, subject: defaults.subject, body: defaults.body, is_active: true,
  });
  if (template.is_active === false) throw new Error('This email template is disabled. Enable it in Email Templates before sending.');
  return { subject: interpolateEmail(template.subject, variables), body: interpolateEmail(template.body, variables) };
}