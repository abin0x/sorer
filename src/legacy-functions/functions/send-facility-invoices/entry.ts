// @ts-nocheck
// send-facility-invoices — weekly delivery of draft facility invoices.
//
// Called by the "Facilities Invoice Delivery" workflow every Monday. For each DRAFT
// invoice whose club still has the facilities module active, it renders a real PDF,
// emails it to the billing entity's contact_email, and stamps the invoice with
// last_emailed_at / email_count. Status stays "draft" so the facilities manager still
// reviews and marks it sent.

import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { clubHasFacilityBilling, emailFacilityInvoice, entityRows } from '../../shared/facilityBilling.ts';

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });

    const svc = base44.asServiceRole;
    const nowIso = new Date().toISOString();

    const drafts = [];
    let cursor;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await svc.entities.Invoice.filter(
        { status: 'draft' },
        cursor ? { limit: PAGE_SIZE, cursor } : { limit: PAGE_SIZE }
      );
      drafts.push(...entityRows(res));
      if (!res?.has_more || !res?.next_cursor) break;
      cursor = res.next_cursor;
    }

    const summary = { drafts_found: drafts.length, emailed: 0, skipped: [], errors: [] };

    for (const invoice of drafts) {
      try {
        if (!(await clubHasFacilityBilling(svc, invoice.club_id))) {
          summary.skipped.push(`${invoice.invoice_number}: facilities module not active`);
          continue;
        }
        if (!(Number(invoice.balance ?? invoice.total) > 0)) {
          summary.skipped.push(`${invoice.invoice_number}: nothing outstanding`);
          continue;
        }

        const entity = await svc.entities.BillingEntity.get(invoice.billing_entity_id).catch(() => null);
        if (!entity?.contact_email) {
          summary.skipped.push(`${invoice.invoice_number}: billing entity has no contact email`);
          continue;
        }

        const lines = entityRows(
          await svc.entities.InvoiceLineItem.filter({ invoice_id: invoice.id }, { limit: 300 })
        );
        const club = await svc.entities.Club.get(invoice.club_id).catch(() => null);

        await emailFacilityInvoice(base44, { invoice, entity, club, lines });

        await svc.entities.Invoice.update(invoice.id, {
          last_emailed_at: nowIso,
          email_count: Number(invoice.email_count || 0) + 1,
        });
        summary.emailed++;
        console.log(`send-facility-invoices: emailed ${invoice.invoice_number}`);
      } catch (invoiceError) {
        const message = `${invoice.invoice_number}: ${invoiceError?.message || invoiceError}`;
        console.error('send-facility-invoices: failed —', message);
        summary.errors.push(message);
      }
    }

    return Response.json({ ok: true, ...summary });
  } catch (error) {
    console.error('send-facility-invoices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}