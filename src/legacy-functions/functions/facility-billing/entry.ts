// @ts-nocheck
// facility-billing — the facilities manager's billing API.
//
// Backs the admin-only Facility Billing page: review draft invoices, mark them sent,
// record payments (manually or through Stripe), manage billing entities, and configure
// the Stripe webhook endpoint.
//
// Every action is gated on the facilities module being active for the caller's club.

import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { secrets } from '@/legacy-functions/_runtime';
import { clubHasFacilityBilling, entityRows, recordFacilityPayment, round2 } from '../../shared/facilityBilling.ts';

const MANAGER_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'facility_manager', 'bookkeeper'];

const canManage = (user) =>
  user?.role === 'admin' || user?.is_super_admin === true || MANAGER_ROLES.includes(user?.custom_role);

/** The club's invoice must belong to the caller's club — never trust an id from the client. */
async function ownInvoice(svc, clubId, invoiceId) {
  const invoice = await svc.entities.Invoice.get(String(invoiceId || '')).catch(() => null);
  if (!invoice || invoice.club_id !== clubId) return null;
  return invoice;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManage(user)) {
      return Response.json({ error: 'Forbidden — facilities manager access required' }, { status: 403 });
    }
    if (!user.club_id) return Response.json({ error: 'Your account is not linked to a club.' }, { status: 400 });

    const svc = base44.asServiceRole;
    const clubId = user.club_id;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'overview');

    if (!(await clubHasFacilityBilling(svc, clubId))) {
      return Response.json({ ok: true, module_active: false });
    }

    if (action === 'overview') {
      const [invoicesRes, entitiesRes] = await Promise.all([
        svc.entities.Invoice.filter({ club_id: clubId }, { limit: 200, sort: '-created_date' }),
        svc.entities.BillingEntity.filter({ club_id: clubId }, { limit: 200, sort: 'name' }),
      ]);
      const invoices = entityRows(invoicesRes);
      const totals = { draft: 0, outstanding: 0, collected: 0 };
      for (const inv of invoices) {
        if (inv.status === 'draft') totals.draft = round2(totals.draft + Number(inv.total || 0));
        if (!['paid', 'void'].includes(inv.status)) totals.outstanding = round2(totals.outstanding + Number(inv.balance ?? inv.total ?? 0));
        totals.collected = round2(totals.collected + Number(inv.amount_paid || 0));
      }
      return Response.json({
        ok: true,
        module_active: true,
        invoices,
        entities: entityRows(entitiesRes),
        totals,
      });
    }

    if (action === 'invoice_detail') {
      const invoice = await ownInvoice(svc, clubId, body.invoice_id);
      if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });
      const [linesRes, paymentsRes, entity] = await Promise.all([
        svc.entities.InvoiceLineItem.filter({ invoice_id: invoice.id }, { limit: 300 }),
        svc.entities.PaymentRecord.filter({ invoice_id: invoice.id }, { limit: 100, sort: '-paid_at' }),
        svc.entities.BillingEntity.get(invoice.billing_entity_id).catch(() => null),
      ]);
      return Response.json({
        ok: true,
        invoice,
        lines: entityRows(linesRes),
        payments: entityRows(paymentsRes),
        entity,
      });
    }

    if (action === 'mark_sent') {
      const invoice = await ownInvoice(svc, clubId, body.invoice_id);
      if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });
      if (invoice.status === 'draft') {
        await svc.entities.Invoice.update(invoice.id, { status: 'sent', sent_at: new Date().toISOString() });
      }
      return Response.json({ ok: true });
    }

    if (action === 'record_payment') {
      const invoice = await ownInvoice(svc, clubId, body.invoice_id);
      if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });
      if (invoice.status === 'void') return Response.json({ error: 'This invoice was voided.' }, { status: 400 });

      const amount = round2(body.amount);
      if (!(amount > 0)) return Response.json({ error: 'Enter an amount greater than zero.' }, { status: 400 });

      const result = await recordFacilityPayment(svc, {
        invoice,
        amount,
        method: String(body.method || 'manual'),
        reference: String(body.reference || ''),
        paidAt: body.paid_at ? new Date(body.paid_at).toISOString() : null,
        recordedBy: user.email,
        notes: String(body.notes || ''),
        currency: invoice.currency || 'USD',
      });

      return Response.json({ ok: true, invoice: result.invoice, record: result.record });
    }

    if (action === 'save_entity') {
      const name = String(body.name || '').trim();
      const contactEmail = String(body.contact_email || '').trim();
      if (!name) return Response.json({ error: 'A name is required.' }, { status: 400 });
      if (!contactEmail) return Response.json({ error: 'A billing contact email is required — invoices are emailed there.' }, { status: 400 });

      const payload = {
        club_id: clubId,
        name,
        contact_email: contactEmail,
        contact_name: String(body.contact_name || ''),
        contact_phone: String(body.contact_phone || ''),
        address: String(body.address || ''),
        notes: String(body.notes || ''),
        default_hourly_rate: Number(body.default_hourly_rate) || 0,
        payment_terms_days: Number(body.payment_terms_days) || 30,
        status: body.status === 'inactive' ? 'inactive' : 'active',
      };

      if (body.entity_id) {
        const existing = await svc.entities.BillingEntity.get(String(body.entity_id)).catch(() => null);
        if (!existing || existing.club_id !== clubId) {
          return Response.json({ error: 'Billing entity not found' }, { status: 404 });
        }
        const entity = await svc.entities.BillingEntity.update(existing.id, payload);
        return Response.json({ ok: true, entity });
      }

      const entity = await svc.entities.BillingEntity.create(payload);
      return Response.json({ ok: true, entity });
    }

    if (action === 'stripe_status') {
      const [credsRes, club] = await Promise.all([
        svc.entities.ClubCredential.filter({ club_id: clubId }, { limit: 1 }),
        svc.entities.Club.get(clubId).catch(() => null),
      ]);
      const cred = entityRows(credsRes)[0] || null;
      const appUrl = req.headers.get('x-base44-app-url') || 'https://club-rudder-os.base44.app';
      return Response.json({
        ok: true,
        module_active: true,
        stripe: {
          own_account: !!cred?.stripe_secret_key,
          secret_key_set: !!cred?.stripe_secret_key || !!secrets.get('STRIPE_SECRET_KEY'),
          webhook_secret_set: !!cred?.stripe_facility_webhook_secret || !!secrets.get('MODULE_STRIPE_WEBHOOK_SECRET'),
          own_webhook_secret_set: !!cred?.stripe_facility_webhook_secret,
          account_id: club?.stripe_account_id || null,
          webhook_url: `${appUrl}/functions/facility-billing-stripe-webhook?club_id=${clubId}`,
        },
      });
    }

    if (action === 'save_webhook_secret') {
      const webhookSecret = String(body.webhook_secret || '').trim();
      if (!webhookSecret.startsWith('whsec_')) {
        return Response.json(
          { error: 'That does not look like a Stripe signing secret — it starts with whsec_.' },
          { status: 400 }
        );
      }
      const creds = entityRows(await svc.entities.ClubCredential.filter({ club_id: clubId }, { limit: 1 }));
      const cred = creds[0];
      if (cred) {
        await svc.entities.ClubCredential.update(cred.id, { stripe_facility_webhook_secret: webhookSecret });
      } else {
        await svc.entities.ClubCredential.create({ club_id: clubId, stripe_facility_webhook_secret: webhookSecret });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('facility-billing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}