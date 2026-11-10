// @ts-nocheck
// generate-facility-invoices — the monthly draft invoice run for the facilities billing module.
//
// Called by the "Facilities Invoice Generation" workflow on the 1st of each month.
// It finds every CONFIRMED EXTERNAL training/game booking from the previous month that
// has not been invoiced yet, groups them by billing entity, and creates one DRAFT
// invoice per entity with one line item per booking (marking each booking invoiced so
// it can never be billed twice). Internal bookings are ignored entirely.
//
// One invoice per entity per period: an entity that already has an invoice for the
// period is skipped, so a re-run cannot duplicate invoices.

import { createClientFromRequest } from '@/legacy-functions/_sdk';
import {
  clubHasFacilityBilling,
  entityRows,
  invoiceNumberFor,
  lineAmountFor,
  lineItemFor,
  monthKey,
  monthLabel,
  previousMonthBounds,
  round2,
} from '../../shared/facilityBilling.ts';

const PAGE_SIZE = 300;
const MAX_PAGES = 20;
const UPDATE_CHUNK = 200;
async function loadPeriodBookings(svc, clubId, period) {
  const bookings = [];
  let cursor;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await svc.entities.Booking.filter(
      {
        club_id: clubId,
        date: { $gte: period.start, $lte: period.end },
      },
      cursor ? { limit: PAGE_SIZE, cursor } : { limit: PAGE_SIZE }
    );
    bookings.push(...entityRows(res));
    if (!res?.has_more || !res?.next_cursor) break;
    cursor = res.next_cursor;
  }
  return bookings;
}

/** Next invoice sequence number for the club in this period. */
async function nextSequence(svc, clubId, periodStart) {
  const rows = entityRows(
    await svc.entities.Invoice.filter({ club_id: clubId, period_start: periodStart }, { limit: 200 }).catch(() => [])
  );
  const numbers = rows
    .map((r) => parseInt(String(r.invoice_number || '').split('-').pop(), 10))
    .filter((n) => Number.isFinite(n));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const period = body.period_start
      ? {
          start: String(body.period_start),
          end: String(body.period_end || body.period_start),
          label: monthLabel(body.period_start),
          key: monthKey(body.period_start),
        }
      : previousMonthBounds(new Date());

    const now = new Date();
    const nowIso = now.toISOString();
    const issueDate = nowIso.slice(0, 10);

    const clubs = entityRows(await svc.entities.Club.list({ limit: 500 })).filter(
      (c) => c.is_active !== false && !c.is_demo
    );

    const summary = {
      period,
      clubs_checked: clubs.length,
      clubs_processed: 0,
      clubs_skipped: [],
      invoices_created: 0,
      line_items: 0,
      bookings_invoiced: 0,
      zero_rate_bookings: 0,
      errors: [],
    };

    for (const club of clubs) {
      try {
        // The module has to be active for this club — its data access and workflows are gated on it.
        if (!(await clubHasFacilityBilling(svc, club.id))) {
          summary.clubs_skipped.push(club.name || club.id);
          continue;
        }
        summary.clubs_processed++;

        const bookings = await loadPeriodBookings(svc, club.id, period);
        const eligible = bookings.filter(
          (b) =>
            b.status === 'confirmed' &&
            b.billing_scope === 'external' &&
            !!b.billing_entity_id &&
            !b.invoice_id
        );
        if (eligible.length === 0) continue;

        const existing = entityRows(
          await svc.entities.Invoice.filter({ club_id: club.id, period_start: period.start }, { limit: 200 }).catch(() => [])
        );
        const alreadyInvoiced = new Set(existing.map((i) => i.billing_entity_id));

        const groups = new Map();
        for (const booking of eligible) {
          if (alreadyInvoiced.has(booking.billing_entity_id)) continue;
          if (!groups.has(booking.billing_entity_id)) groups.set(booking.billing_entity_id, []);
          groups.get(booking.billing_entity_id).push(booking);
        }

        let sequence = await nextSequence(svc, club.id, period.start);

        for (const [entityId, group] of groups) {
          const entity = await svc.entities.BillingEntity.get(entityId).catch(() => null);
          if (!entity || entity.status === 'inactive') continue;

          const lines = group.map((booking) =>
            lineItemFor(booking, { invoiceId: '', entity, amount: lineAmountFor(booking, entity) })
          );
          const total = round2(lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0));
          const zeroRate = lines.filter((l) => !(Number(l.amount) > 0)).length;
          summary.zero_rate_bookings += zeroRate;
          if (zeroRate > 0) {
            console.warn(
              `generate-facility-invoices: ${zeroRate} booking(s) for ${entity.name} have no rate set — invoiced at 0.00`
            );
          }

          const terms = Number(entity.payment_terms_days) > 0 ? Number(entity.payment_terms_days) : 30;
          const dueDate = new Date(now.getTime() + terms * 86400000).toISOString().slice(0, 10);

          const invoice = await svc.entities.Invoice.create({
            club_id: club.id,
            billing_entity_id: entity.id,
            billing_entity_name: entity.name,
            invoice_number: invoiceNumberFor(period.key, sequence++),
            period_label: period.label,
            period_start: period.start,
            period_end: period.end,
            issue_date: issueDate,
            due_date: dueDate,
            status: 'draft',
            subtotal: total,
            total,
            amount_paid: 0,
            balance: total,
            currency: 'USD',
            booking_count: group.length,
            email_count: 0,
            created_by: 'system',
          });

          await svc.entities.InvoiceLineItem.bulkCreate(
            lines.map((line) => ({ ...line, invoice_id: invoice.id }))
          );

          const stamps = group.map((b) => ({ id: b.id, invoice_id: invoice.id, invoiced_at: nowIso }));
          for (const part of chunk(stamps, UPDATE_CHUNK)) {
            await svc.entities.Booking.bulkUpdate(part);
          }

          summary.invoices_created++;
          summary.line_items += lines.length;
          summary.bookings_invoiced += group.length;
          console.log(
            `generate-facility-invoices: ${invoice.invoice_number} for ${entity.name} (${group.length} bookings, ${total})`
          );
        }
      } catch (clubError) {
        const message = `${club.name || club.id}: ${clubError?.message || clubError}`;
        console.error('generate-facility-invoices: club failed —', message);
        summary.errors.push(message);
      }
    }

    return Response.json({ ok: true, ...summary });
  } catch (error) {
    console.error('generate-facility-invoices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}