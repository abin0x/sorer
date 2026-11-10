// Embedded default content for all generated email templates (base44/emails/*.html).
// The backend function (email-templates) tries to read the live files at runtime;
// these are the fallback used when the filesystem is not accessible.

const COMPLIANCE_WARNING = `<mjml>
  <mj-head>
    <mj-title>Compliance action needed — {{season}}</mj-title>
    <mj-preview>Your compliance status needs attention. Please review and upload required documents.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, Helvetica, Arial, sans-serif" />
      <mj-section background-color="#ffffff" padding="0 36px" />
      <mj-text color="#0f172a" font-size="15px" line-height="1.6" padding="0" />
      <mj-button background-color="#5048e5" border-radius="8px" font-weight="700" inner-padding="14px 28px" align="left" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f8fafc">
    <mj-section padding="40px 36px 12px"><mj-column>
      <mj-text font-size="13px" font-weight="700" letter-spacing="0.12em" text-transform="uppercase" color="#5048e5">Club Rudder · Compliance</mj-text>
      <mj-text font-size="26px" font-weight="800" line-height="1.15" padding-top="8px">Compliance action needed</mj-text>
      <mj-text font-size="15px" color="#64748b" padding-top="4px">{{coach_name}}, your compliance status needs attention for the {{season}} season.</mj-text>
    </mj-column></mj-section>

    <mj-section padding="12px 36px"><mj-column>
      <mj-text>The following compliance items require your attention:</mj-text>
      <mj-text font-size="15px" font-weight="600" color="#dc2626" padding-top="8px">{{items}}</mj-text>
      <mj-text padding-top="8px">Please log in to your account and upload the required documents. Your club admin will review them, and you will be notified once they are approved. Coaches with outstanding compliance items cannot be assigned to teams.</mj-text>
    </mj-column></mj-section>

    <mj-section padding="12px 36px"><mj-column>
      <mj-button href="https://clubrudder.com/MyCompliance">Review my compliance</mj-button>
    </mj-column></mj-section>

    <mj-section padding="8px 36px 40px"><mj-column>
      <mj-text font-size="12px" color="#94a3b8">If you have already uploaded your documents, they may still be under review. Contact your club admin if you have questions.</mj-text>
    </mj-column></mj-section>
  </mj-body>
</mjml>`;

const COMPLIANCE_REMINDER = `<mjml>
  <mj-head>
    <mj-title>Action needed: compliance due before {{season}} starts</mj-title>
    <mj-preview>Your season starts soon — complete your compliance requirements.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, Helvetica, Arial, sans-serif" />
      <mj-section background-color="#ffffff" padding="0 36px" />
      <mj-text color="#0f172a" font-size="15px" line-height="1.6" padding="0" />
      <mj-button background-color="#5048e5" border-radius="8px" font-weight="700" inner-padding="14px 28px" align="left" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f8fafc">
    <mj-section padding="40px 36px 12px"><mj-column>
      <mj-text font-size="13px" font-weight="700" letter-spacing="0.12em" text-transform="uppercase" color="#5048e5">Club Rudder · Compliance</mj-text>
      <mj-text font-size="26px" font-weight="800" line-height="1.15" padding-top="8px">Your season starts in 7 days</mj-text>
      <mj-text font-size="15px" color="#64748b" padding-top="4px">{{season}} starts on {{start_date}}.</mj-text>
    </mj-column></mj-section>

    <mj-section padding="12px 36px"><mj-column>
      <mj-text>You still need to complete the following before you can be assigned to a team:</mj-text>
      <mj-text font-size="16px" font-weight="700" color="#dc2626">{{items}}</mj-text>
      <mj-text>Upload your certificate in the My Compliance page. Your club admin will review it, and you will be notified once it is approved.</mj-text>
    </mj-column></mj-section>

    <mj-section padding="12px 36px"><mj-column>
      <mj-button href="https://clubrudder.com/MyCompliance">Upload my certificate</mj-button>
    </mj-column></mj-section>

    <mj-section padding="8px 36px 40px"><mj-column>
      <mj-text font-size="12px" color="#94a3b8">If you have already uploaded your documents, they may still be under review. Contact your club admin if you have questions.</mj-text>
    </mj-column></mj-section>
  </mj-body>
</mjml>`;

const COMPLIANCE_DIGEST = `<mjml>
  <mj-head>
    <mj-title>Weekly Compliance Digest — {{season}}</mj-title>
    <mj-preview>Your weekly coach compliance summary for the {{season}} season.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, Helvetica, Arial, sans-serif" />
      <mj-section background-color="#ffffff" padding="0 36px" />
      <mj-text color="#0f172a" font-size="15px" line-height="1.6" padding="0" />
      <mj-button background-color="#5048e5" border-radius="8px" font-weight="700" inner-padding="14px 28px" align="left" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f8fafc">
    <mj-section padding="40px 36px 12px"><mj-column>
      <mj-text font-size="13px" font-weight="700" letter-spacing="0.12em" text-transform="uppercase" color="#5048e5">Club Rudder · Compliance</mj-text>
      <mj-text font-size="28px" font-weight="800" line-height="1.15" padding-top="8px">Weekly Compliance Digest</mj-text>
      <mj-text font-size="15px" color="#64748b" padding-top="4px">{{season}} season · {{bodies}}</mj-text>
    </mj-column></mj-section>

    <mj-section padding="12px 36px"><mj-column>
      <mj-text font-weight="700" font-size="16px">At a glance</mj-text>
      <mj-table cellpadding="8" css-class="digest-table" container-background-color="#f8fafc">
        <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 14px">Coaches</td><td style="text-align:right;font-weight:700">{{stats.total}}</td></tr>
        <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 14px;color:#059669">Fully compliant</td><td style="text-align:right;font-weight:700;color:#059669">{{stats.compliant}}</td></tr>
        <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 14px;color:#d97706">Pending review</td><td style="text-align:right;font-weight:700;color:#d97706">{{stats.pending}}</td></tr>
        <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 14px;color:#ea580c">Flagged</td><td style="text-align:right;font-weight:700;color:#ea580c">{{stats.flagged}}</td></tr>
        <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 14px;color:#dc2626">Missing</td><td style="text-align:right;font-weight:700;color:#dc2626">{{stats.missing}}</td></tr>
        <tr><td style="padding:10px 14px;color:#dc2626">Expired</td><td style="text-align:right;font-weight:700;color:#dc2626">{{stats.expired}}</td></tr>
      </mj-table>
    </mj-column></mj-section>

    <mj-section padding="12px 36px"><mj-column>
      <mj-button href="https://clubrudder.com/Compliance">Open Compliance Dashboard</mj-button>
    </mj-column></mj-section>

    <mj-section padding="8px 36px 40px"><mj-column>
      <mj-text font-size="12px" color="#94a3b8">You are receiving this because you are a club director or admin. This digest is sent weekly.</mj-text>
    </mj-column></mj-section>
  </mj-body>
</mjml>`;

const REPORT_DELIVERY = `<mjml>
  <mj-head>
    <mj-title>{{report_name}} — Scheduled Report</mj-title>
    <mj-preview>Your scheduled report is ready: {{report_name}}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, Helvetica, Arial, sans-serif" />
      <mj-section background-color="#ffffff" padding="0 36px" />
      <mj-text color="#0b162b" font-size="15px" line-height="1.6" padding="0" />
      <mj-button background-color="#5048e5" border-radius="24px" font-weight="700" inner-padding="14px 28px" align="left" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f8fafc">
    <mj-section background-color="#5048e5" padding="20px 36px">
      <mj-column>
        <mj-text color="#ffffff" font-size="18px" font-weight="800" padding="0">
          Club Rudder
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section padding="36px 36px 12px">
      <mj-column>
        <mj-text font-size="24px" font-weight="800" line-height="1.2" padding="0">
          Your scheduled report is ready
        </mj-text>
        <mj-text color="#64748b" font-size="14px" padding="0" padding-top="8px">
          {{report_name}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section padding="12px 36px">
      <mj-column>
        <mj-text color="#0b162b" font-size="15px" padding="0">
          Hi {{recipient_name}},
        </mj-text>
        <mj-text color="#0b162b" font-size="15px" padding="0" padding-top="12px">
          Your scheduled report <strong>{{report_name}}</strong> is attached to this email as a {{format}} file. The data in this report has been scoped to your role and access level.
        </mj-text>
        <mj-text color="#64748b" font-size="13px" padding="0" padding-top="12px">
          Generated: {{generated_at}}<br />
          Rows: {{row_count}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section padding="24px 36px 36px">
      <mj-column>
        <mj-button href="{{app_url}}" background-color="#5048e5" border-radius="24px" color="#ffffff" font-weight="700">
          View in Club Rudder
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section background-color="#f8fafc" padding="20px 36px">
      <mj-column>
        <mj-text color="#64748b" font-size="12px" padding="0" align="center">
          This report was scheduled by {{owner_name}}. You received only data your role allows.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

export const TEMPLATE_LIST = [
  {
    name: 'ComplianceWarning',
    description: 'Sent to coaches when their compliance status is flagged or expired',
    variables: ['coach_name', 'season', 'items'],
    defaultContent: COMPLIANCE_WARNING,
  },
  {
    name: 'ComplianceReminder',
    description: 'Sent before season start to coaches with missing compliance items',
    variables: ['season', 'start_date', 'items'],
    defaultContent: COMPLIANCE_REMINDER,
  },
  {
    name: 'ComplianceDigest',
    description: 'Weekly compliance summary sent to club directors and admins',
    variables: ['season', 'bodies', 'stats.total', 'stats.compliant', 'stats.pending', 'stats.flagged', 'stats.missing', 'stats.expired'],
    defaultContent: COMPLIANCE_DIGEST,
  },
  {
    name: 'ReportDelivery',
    description: 'Sent with scheduled report attachments to report recipients',
    variables: ['report_name', 'recipient_name', 'format', 'generated_at', 'row_count', 'app_url', 'owner_name'],
    defaultContent: REPORT_DELIVERY,
  },
];

const SAMPLE_VALUES = {
  coach_name: 'Coach Smith',
  season: '2026-2027',
  items: 'Background Check: expired\nSafeSport Certification: missing',
  start_date: 'October 25, 2026',
  bodies: 'Main Campus',
  'stats.total': '24',
  'stats.compliant': '18',
  'stats.pending': '3',
  'stats.flagged': '1',
  'stats.missing': '1',
  'stats.expired': '1',
  report_name: 'Q4 Financial Summary',
  recipient_name: 'John Doe',
  format: 'PDF',
  generated_at: 'Oct 19, 2026 11:14 AM',
  row_count: '142',
  app_url: 'https://clubrudder.com',
  owner_name: 'Club Admin',
};

function fillSampleVars(content) {
  return content.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return SAMPLE_VALUES[trimmed] || `{{${trimmed}}}`;
  });
}

// Simple MJML-to-HTML converter for preview purposes.
export function mjmlToPreview(mjml) {
  const bgMatch = mjml.match(/<mj-body[^>]*background-color="([^"]*)"/);
  const bgColor = bgMatch ? bgMatch[1] : '#f8fafc';

  const bodyMatch = mjml.match(/<mj-body[^>]*>([\s\S]*?)<\/mj-body>/);
  let body = bodyMatch ? bodyMatch[1] : '';

  // Sections → divs with padding
  body = body.replace(/<mj-section([^>]*)>/g, (_, attrs) => {
    const padding = (attrs.match(/padding="([^"]*)"/) || [])[1] || '20px 0';
    const bg = (attrs.match(/background-color="([^"]*)"/) || [])[1];
    return `<div style="padding:${padding};${bg ? `background-color:${bg};` : ''}">`;
  });
  body = body.replace(/<\/mj-section>/g, '</div>');

  // Columns → divs
  body = body.replace(/<mj-column[^>]*>/g, '<div style="padding:8px;">');
  body = body.replace(/<\/mj-column>/g, '</div>');

  // Text → divs with extracted styles
  body = body.replace(/<mj-text([^>]*)>([\s\S]*?)<\/mj-text>/g, (_, attrs, content) => {
    const styles = ['margin:0', 'line-height:1.6', 'font-family:Inter,Helvetica,Arial,sans-serif'];
    const color = (attrs.match(/color="([^"]*)"/) || [])[1];
    const fontSize = (attrs.match(/font-size="([^"]*)"/) || [])[1];
    const fontWeight = (attrs.match(/font-weight="([^"]*)"/) || [])[1];
    const padding = (attrs.match(/padding="([^"]*)"/) || [])[1];
    const align = (attrs.match(/align="([^"]*)"/) || [])[1];
    if (color) styles.push(`color:${color}`);
    if (fontSize) styles.push(`font-size:${fontSize}`);
    if (fontWeight) styles.push(`font-weight:${fontWeight}`);
    if (padding) styles.push(`padding:${padding}`);
    if (align) styles.push(`text-align:${align}`);
    return `<div style="${styles.join(';')}">${content}</div>`;
  });

  // Buttons → anchor links
  body = body.replace(/<mj-button([^>]*)>([\s\S]*?)<\/mj-button>/g, (_, attrs, content) => {
    const href = (attrs.match(/href="([^"]*)"/) || [])[1] || '#';
    const bg = (attrs.match(/background-color="([^"]*)"/) || [])[1] || '#5048e5';
    const radius = (attrs.match(/border-radius="([^"]*)"/) || [])[1] || '8px';
    return `<a href="${href}" style="display:inline-block;padding:14px 28px;background-color:${bg};color:#fff;border-radius:${radius};text-decoration:none;font-weight:700;font-family:Inter,Helvetica,Arial,sans-serif;">${content}</a>`;
  });

  // Images
  body = body.replace(/<mj-image([^>]*)\/>/g, (_, attrs) => {
    const src = (attrs.match(/src="([^"]*)"/) || [])[1] || '';
    return `<img src="${src}" style="max-width:100%;height:auto;" />`;
  });

  // Tables
  body = body.replace(/<mj-table([^>]*)>([\s\S]*?)<\/mj-table>/g, (_, _attrs, content) =>
    `<table style="width:100%;border-collapse:collapse;font-family:Inter,Helvetica,Arial,sans-serif;">${content}</table>`);

  // Strip remaining MJML tags
  body = body.replace(/<mj-[^>]*>/g, '').replace(/<\/mj-[^>]*>/g, '');

  const filled = fillSampleVars(body);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:${bgColor};"><div style="max-width:600px;margin:0 auto;background-color:${bgColor};font-family:Inter,Helvetica,Arial,sans-serif;">${filled}</div></body></html>`;
}