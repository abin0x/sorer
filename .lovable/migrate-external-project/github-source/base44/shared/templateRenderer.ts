// Template rendering: takes an OutreachTemplate and a Prospect, returns rendered { subject, html }.
// Validates that all declared variables resolve; fails loudly if a variable is missing.

export function extractVariables(text) {
  if (!text) return [];
  const matches = [...text.matchAll(/\{\{(\w+)\}\}/g)];
  return [...new Set(matches.map(m => m[1]))];
}

export function renderString(str, variables) {
  if (!str) return '';
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined && variables[key] !== null
      ? String(variables[key])
      : match;
  });
}

export function validateVariables(template, variables) {
  const allVars = new Set([
    ...extractVariables(template.subject),
    ...extractVariables(template.body_html),
  ]);
  const missing = [];
  for (const v of allVars) {
    if (variables[v] === undefined || variables[v] === null || variables[v] === '') {
      missing.push(v);
    }
  }
  return missing;
}

export function buildVariables(prospect) {
  return {
    first_name: prospect.first_name || '',
    last_name: prospect.last_name || '',
    full_name: `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim(),
    club_name: prospect.club_name || '',
    title: prospect.title || '',
    branch_count: prospect.branch_count != null ? String(prospect.branch_count) : '',
    player_count: prospect.player_count != null ? String(prospect.player_count) : '',
    region: prospect.region || '',
    pain_signal_line: prospect.pain_signal || '',
    registration_platform: prospect.registration_platform || '',
  };
}

export function renderTemplate(template, prospect) {
  const variables = buildVariables(prospect);
  const missing = validateVariables(template, variables);
  if (missing.length > 0) {
    throw new Error(`Missing template variables: ${missing.join(', ')}`);
  }
  return {
    subject: renderString(template.subject, variables),
    html: renderString(template.body_html, variables),
  };
}

export function renderWithVariables(template, variables) {
  const missing = validateVariables(template, variables);
  if (missing.length > 0) {
    throw new Error(`Missing template variables: ${missing.join(', ')}`);
  }
  return {
    subject: renderString(template.subject, variables),
    html: renderString(template.body_html, variables),
  };
}

/** Wrap rendered HTML with CAN-SPAM compliance footer (physical address + unsubscribe link). */
export function addComplianceFooter(html, settings, unsubscribeUrl) {
  const address = (settings?.physical_address || 'ClubRudder, 123 Main St, Suite 100, Ann Arbor, MI 48104')
    .replace(/\n/g, '<br>');
  const footer = `
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e8e8e8;">
      <p style="color:#94a3b8;font-size:11px;line-height:1.6;margin:0;font-family:Inter,Arial,sans-serif;">
        ${address}<br><br>
        You received this email because we believe ClubRudder can help your club operate more efficiently.
        <a href="${unsubscribeUrl}" style="color:#6366f1;">Unsubscribe</a> anytime.
      </p>
    </div>`;
  if (html.includes('</body>')) {
    return html.replace('</body>', footer + '</body>');
  }
  return html + footer;
}

export function buildUnsubscribeUrl(appUrl, prospect) {
  const base = appUrl || 'https://clubrudder.com';
  return `${base}/functions/outreach-webhook?action=unsubscribe&pid=${prospect.id}&email=${encodeURIComponent(prospect.email)}`;
}