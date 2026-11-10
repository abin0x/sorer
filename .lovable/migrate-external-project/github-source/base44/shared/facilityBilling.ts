// Shared logic for the facilities billing module.
//
// Converts confirmed EXTERNAL field bookings into monthly draft invoices,
// renders invoice PDFs, emails them to the billing contact, and records
// payments (manually or from Stripe) against the Bookkeeping ledger.
//
// Used by: generate-facility-invoices, send-facility-invoices, facility-billing,
// facility-invoice-portal, facility-billing-stripe-webhook.

import { jsPDF } from 'npm:jspdf@4.0.0';
import { sendBrandedEmail } from './resendEmail.ts';
import { tenantModuleHasAccess } from './moduleAccess.ts';

/** Module that must be active for facility billing to function. */
export const FACILITY_BILLING_MODULE = 'facilities';

/** Where an outside organization views and pays its invoices. */
export const PORTAL_URL = 'https://clubrudder.com/MyInvoices';

const DEFAULT_BRAND = '#5048e5';

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

/** Reads a query result defensively — option queries return { items, next_cursor }. */
export function entityRows(res) {
  if (Array.isArray(res)) return res;
  return res?.items || [];
}

/** Escapes user-supplied text before it goes into email HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ------------------------------------------------------------------ */
/* Module gate                                                         */
/* ------------------------------------------------------------------ */

/** True when the club has the facilities module active right now. */
export async function clubHasFacilityBilling(svc, clubId) {
  if (!clubId) return false;
  const [clubs, modules] = await Promise.all([
    svc.entities.Club.filter({ id: clubId }).catch(() => []),
    svc.entities.TenantModule.filter({ club_id: clubId }, '-created_date', 200).catch(() => []),
  ]);
  const club = clubs?.[0];
  if (!club) return false;
  return tenantModuleHasAccess(club, modules, FACILITY_BILLING_MODULE);
}

/* ------------------------------------------------------------------ */
/* Period + amounts                                                    */
/* ------------------------------------------------------------------ */

/** The calendar month that just ended, as the default billing period. */
export function previousMonthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { start: isoDay(start), end: isoDay(end), label: monthLabel(start), key: monthKey(start) };
}

export function monthLabel(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** YYYYMM, used in invoice numbers. */
export function monthKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function invoiceNumberFor(periodKey, sequence) {
  return `FV-${periodKey}-${String(sequence).padStart(4, '0')}`;
}

/** Hours a booking occupies, from its minute offsets. */
export function bookingHours(booking) {
  const mins = Number(booking?.end_min ?? 0) - Number(booking?.start_min ?? 0);
  if (!(mins > 0)) return 0;
  return Math.round((mins / 60) * 100) / 100;
}

/**
 * Amount to bill for one booking: an explicit flat amount wins, otherwise
 * hours x the booking rate (falling back to the entity's default rate).
 */
export function lineAmountFor(booking, entity) {
  if (Number(booking?.billing_amount) > 0) return round2(booking.billing_amount);
  const rate = Number(booking?.billing_rate) > 0 ? Number(booking.billing_rate) : Number(entity?.default_hourly_rate || 0);
  const hours = bookingHours(booking);
  if (rate > 0 && hours > 0) return round2(rate * hours);
  return 0;
}

/** Line item shape for a booking, with its invoice/entity keys attached. */
export function lineItemFor(booking, { invoiceId, entity, amount }) {
  const hours = bookingHours(booking);
  return {
    club_id: booking.club_id,
    invoice_id: invoiceId,
    billing_entity_id: booking.billing_entity_id,
    booking_id: booking.id,
    description: `Field rental — ${booking.event_type || booking.type || 'booking'}`,
    details: bookingSummary(booking),
    booking_date: booking.date,
    field_name: booking.field_name || '',
    facility_name: booking.facility_name || '',
    start_time: booking.start_time || '',
    end_time: booking.end_time || '',
    hours,
    unit_rate: Number(booking.billing_rate) > 0 ? Number(booking.billing_rate) : Number(entity?.default_hourly_rate || 0),
    amount,
  };
}

/** Human summary of what a booking covers, for invoice lines and emails. */
export function bookingSummary(booking) {
  const teams = [booking.team_name, booking.away_team_name].filter(Boolean).join(' vs ');
  return teams || booking.coach_name || booking.grid_label || '';
}

/** Status after a payment lands. */
export function statusAfterPayment(total, paid) {
  if (round2(paid) >= round2(total)) return 'paid';
  if (round2(paid) > 0) return 'partially_paid';
  return 'draft';
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return [80, 72, 229];
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const money = (n, currency = 'USD') =>
  `${currency === 'USD' ? '$' : ''}${(Number(n) || 0).toFixed(2)}`;

/**
 * Renders the invoice as a real PDF. Returns base64, ready to attach to an email.
 */
export function buildInvoicePdfBase64({ invoice, lines, entity, club }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const M = 48;
  const W = 612;
  const [r, g, b] = hexToRgb(club?.primary_color || DEFAULT_BRAND);

  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 86, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(String(club?.name || 'Facility Billing').slice(0, 46), M, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Facility rental invoice', M, 62);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('INVOICE', W - M, 44, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(String(invoice.invoice_number || ''), W - M, 62, { align: 'right' });

  let y = 126;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Bill to', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const billTo = [entity?.name, entity?.contact_name, entity?.contact_email, entity?.address].filter(Boolean);
  billTo.forEach((line, i) => doc.text(String(line).slice(0, 60), M, y + 16 + i * 13));

  doc.setTextColor(15, 23, 42);
  const meta = [
    ['Period', invoice.period_label || ''],
    ['Issued', invoice.issue_date || ''],
    ['Due', invoice.due_date || ''],
    ['Bookings', String(invoice.booking_count ?? lines.length)],
  ];
  meta.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, W - M - 150, y + i * 15);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), W - M, y + i * 15, { align: 'right' });
  });

  y += 24 + billTo.length * 13 + 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y, W - M, y);
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('DATE', M, y);
  doc.text('DESCRIPTION', M + 78, y);
  doc.text('HOURS', W - M - 150, y, { align: 'right' });
  doc.text('RATE', W - M - 78, y, { align: 'right' });
  doc.text('AMOUNT', W - M, y, { align: 'right' });
  y += 8;
  doc.line(M, y, W - M, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  for (const line of lines) {
    if (y > 660) {
      doc.addPage();
      y = 72;
    }
    const desc = [line.description, line.details, line.field_name].filter(Boolean).join(' · ').slice(0, 46);
    doc.text(String(line.booking_date || ''), M, y);
    doc.text(desc, M + 78, y);
    doc.text(line.hours ? `${line.hours}` : '—', W - M - 150, y, { align: 'right' });
    doc.text(line.unit_rate ? money(line.unit_rate, invoice.currency) : '—', W - M - 78, y, { align: 'right' });
    doc.text(money(line.amount, invoice.currency), W - M, y, { align: 'right' });
    y += 17;
  }

  y += 8;
  doc.line(M, y, W - M, y);
  y += 22;

  const totals = [
    ['Subtotal', money(invoice.subtotal ?? invoice.total, invoice.currency)],
    ['Amount paid', `-${money(invoice.amount_paid, invoice.currency)}`],
    ['Balance due', money(invoice.balance ?? invoice.total, invoice.currency)],
  ];
  totals.forEach(([label, value], i) => {
    const isLast = i === totals.length - 1;
    doc.setFont('helvetica', isLast ? 'bold' : 'normal');
    doc.setFontSize(isLast ? 12 : 10);
    doc.text(label, W - M - 170, y);
    doc.text(value, W - M, y, { align: 'right' });
    y += isLast ? 18 : 16;
  });

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Pay online: ${PORTAL_URL}`, M, y);
  doc.text('Thank you for renting our facilities.', M, y + 14);

  const bytes = new Uint8Array(doc.output('arraybuffer'));
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

export function buildInvoiceEmailBody({ invoice, entity, club, lines }) {
  const currency = invoice.currency || 'USD';
  const rows = (lines || [])
    .slice(0, 12)
    .map(
      (l) =>
        `<tr>
          <td style="padding:6px 0;color:#334155;font-size:13px;">${esc(l.booking_date || '')}${l.field_name ? ` <span style="color:#94a3b8;">· ${esc(l.field_name)}</span>` : ''}</td>
          <td style="padding:6px 0;color:#0f172a;font-size:13px;text-align:right;">${esc(money(l.amount, currency))}</td>
        </tr>`
    )
    .join('');

  return `
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0f172a;">Invoice ${esc(invoice.invoice_number)}</h1>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;">
      Field rental for ${esc(invoice.period_label || '')}${entity?.name ? ` · ${esc(entity.name)}` : ''}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
      ${rows || `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">${invoice.booking_count || 0} bookings</td><td></td></tr>`}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
      <tr>
        <td style="color:#64748b;font-size:13px;">Total</td>
        <td style="color:#0f172a;font-size:13px;text-align:right;">${esc(money(invoice.total, currency))}</td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:13px;">Already paid</td>
        <td style="color:#0f172a;font-size:13px;text-align:right;">${esc(money(invoice.amount_paid, currency))}</td>
      </tr>
      <tr>
        <td style="color:#0f172a;font-size:15px;font-weight:800;padding-top:6px;">Balance due${invoice.due_date ? ` · by ${esc(invoice.due_date)}` : ''}</td>
        <td style="color:#0f172a;font-size:15px;font-weight:800;padding-top:6px;text-align:right;">${esc(money(invoice.balance ?? invoice.total, currency))}</td>
      </tr>
    </table>
    <p style="margin:18px 0 6px;color:#334155;font-size:14px;">
      The full invoice is attached as a PDF. You can also review every invoice and pay online in the billing portal.
    </p>
    <p style="margin:0;color:#64748b;font-size:12px;">${esc(club?.name || '')}${club?.name ? ' · ' : ''}questions? Just reply to this email.</p>
  `;
}

/** Emails the draft invoice (PDF attached) to the billing entity's contact. */
export async function emailFacilityInvoice(base44, { invoice, entity, club, lines, to }) {
  const recipient = to || entity?.contact_email;
  if (!recipient) throw new Error('This billing entity has no contact email');
  const pdfBase64 = buildInvoicePdfBase64({ invoice, lines, entity, club });
  const subject = `Invoice ${invoice.invoice_number} — ${invoice.period_label || ''}`.trim();
  return sendBrandedEmail(base44, {
    to: recipient,
    subject,
    html: buildInvoiceEmailBody({ invoice, entity, club, lines }),
    from_name: club?.name || undefined,
    attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdfBase64 }],
  });
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

const LEDGER_METHOD = { stripe: 'card', card: 'card', cash: 'cash', check: 'check', ach: 'ach', manual: 'other', other: 'other' };

/**
 * Records a payment against an invoice. Writes the facility PaymentRecord,
 * mirrors it into the Bookkeeping Payment ledger (so the ledger, reports and
 * QuickBooks sync all see it), and reconciles the invoice balances/status.
 */
export async function recordFacilityPayment(svc, params) {
  const {
    invoice,
    amount,
    method = 'manual',
    reference = '',
    paidAt = null,
    recordedBy = '',
    stripeEventId = null,
    notes = '',
    currency = 'USD',
  } = params;

  const entity = await svc.entities.BillingEntity.get(invoice.billing_entity_id).catch(() => null);
  const when = paidAt || new Date().toISOString();

  const ledger = await svc.entities.Payment.create({
    club_id: invoice.club_id,
    source_type: 'other',
    source_id: invoice.id,
    source_label: `Facility invoice ${invoice.invoice_number}`,
    family_email: entity?.contact_email || '',
    guardian_name: entity?.contact_name || entity?.name || '',
    amount: round2(amount),
    currency,
    processor_name: method === 'stripe' ? 'Stripe' : 'Offline',
    payment_method: LEDGER_METHOD[method] || 'other',
    status: 'paid_in_full',
    payment_date: isoDay(when),
    recorded_by: recordedBy,
    charge_type: 'other',
    transaction_reference: reference || '',
    notes: notes || `Facility booking invoice ${invoice.invoice_number}`,
  });

  const paid = round2(Number(invoice.amount_paid || 0) + round2(amount));
  const total = round2(Number(invoice.total || 0));
  const balance = round2(total - paid);
  const status = statusAfterPayment(total, paid);

  const record = await svc.entities.PaymentRecord.create({
    club_id: invoice.club_id,
    invoice_id: invoice.id,
    billing_entity_id: invoice.billing_entity_id,
    billing_entity_name: invoice.billing_entity_name || entity?.name || '',
    invoice_number: invoice.invoice_number,
    amount: round2(amount),
    currency,
    method,
    status: 'confirmed',
    paid_at: when,
    reference: reference || '',
    stripe_event_id: stripeEventId,
    payment_ledger_id: ledger?.id || '',
    recorded_by: recordedBy,
    notes,
  });

  const updated = await svc.entities.Invoice.update(invoice.id, {
    amount_paid: paid,
    balance: Math.max(balance, 0),
    status,
    payment_method: method,
    paid_at: status === 'paid' ? when : null,
  });

  return { record, ledger, invoice: updated, balance: Math.max(balance, 0) };
}