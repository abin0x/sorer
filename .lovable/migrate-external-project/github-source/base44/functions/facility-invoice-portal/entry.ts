// facility-invoice-portal — what an outside billing entity sees when it signs in.
//
// The entity's contact signs in through the app's normal sign-in (magic link / OTP);
// there is no second account system and no password form. On first visit the account is
// linked to the BillingEntity whose billing contacts include the signed-in email, and
// that link (a locked User field) is what scopes every invoice query from then on, so an
// entity can only ever see its own invoices.
//
// Also creates the Stripe Checkout session used to pay an invoice — from the portal or
// from the facilities manager's page.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.7.0';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';
import { entityRows, recordFacilityPayment, round2 } from '../../shared/facilityBilling.ts';

const MANAGER_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'facility_manager', 'bookkeeper'];
const canManage = (user) =>
  user?.role === 'admin' || user?.is_super_admin === true || MANAGER_ROLES.includes(user?.custom_role);

/** The entity whose billing contacts include this email, or null. */
async function findEntityForEmail(svc, email) {
  if (!email) return null;
  const values = [...new Set([String(email), String(email).toLowerCase()])];
  const found = [];
  for (const value of values) {
    found.push(...entityRows(await svc.entities.BillingEntity.filter({ contact_email: value }, { limit: 5 }).catch(() => [])));
    found.push(...entityRows(await svc.entities.BillingEntity.filter({ additional_emails: value }, { limit: 5 }).catch(() => [])));
  }
  return found[0] || null;
}

/** Portal shape — hides internal notes and any field the entity has no business seeing. */
function publicInvoice(inv) {
  return {
    id: inv.id,
    invoice_number: inv.invoice_number,
    period_label: inv.period_label,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    status: inv.status,
    total: inv.total,
    amount_paid: inv.amount_paid,
    balance: inv.balance ?? inv.total,
    currency: inv.currency || 'USD',
    booking_count: inv.booking_count,
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'my_invoices');

    if (action === 'my_invoices') {
      let entity = null;
      if (user.billing_entity_id) {
        entity = await svc.entities.BillingEntity.get(user.billing_entity_id).catch(() => null);
      }
      if (!entity) {
        // First visit from this email — link the account to its billing entity. The backend
        // writes the locked field, so a user can never claim an entity that isn't theirs.
        entity = await findEntityForEmail(svc, user.email);
        if (entity) {
          await svc.entities.User.update(user.id, { billing_entity_id: entity.id });
        }
      }
      if (!entity) return Response.json({ ok: true, linked: false, invoices: [] });

      const [invoicesRes, linesRes] = await Promise.all([
        svc.entities.Invoice.filter({ billing_entity_id: entity.id }, { limit: 100, sort: '-created_date' }),
        svc.entities.InvoiceLineItem.filter({ billing_entity_id: entity.id }, { limit: 500 }),
      ]);
      const lines = entityRows(linesRes);
      const invoices = entityRows(invoicesRes)
        .filter((inv) => inv.status !== 'void')
        .map((inv) => ({
          ...publicInvoice(inv),
          lines: lines
            .filter((l) => l.invoice_id === inv.id)
            .map((l) => ({
              id: l.id,
              booking_date: l.booking_date,
              description: l.description,
              details: l.details,
              field_name: l.field_name,
              hours: l.hours,
              unit_rate: l.unit_rate,
              amount: l.amount,
            })),
        }));

      return Response.json({
        ok: true,
        linked: true,
        entity: { id: entity.id, name: entity.name, contact_name: entity.contact_name },
        invoices,
      });
    }

    if (action === 'create_checkout') {
      const invoice = await svc.entities.Invoice.get(String(body.invoice_id || '')).catch(() => null);
      if (!invoice || invoice.status === 'void') {
        return Response.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const isClubManager = invoice.club_id === user.club_id && canManage(user);
      const isEntityContact = !!user.billing_entity_id && user.billing_entity_id === invoice.billing_entity_id;
      if (!isClubManager && !isEntityContact) {
        return Response.json({ error: 'You do not have access to this invoice' }, { status: 403 });
      }

      const balance = round2(invoice.balance ?? invoice.total);
      if (!(balance > 0)) return Response.json({ error: 'This invoice has nothing left to pay.' }, { status: 400 });
      if (balance < 0.5) return Response.json({ error: 'Stripe cannot charge less than 0.50.' }, { status: 400 });

      const secretKey = (await getStripeSecretKey(base44, invoice.club_id)) || secrets.get('STRIPE_SECRET_KEY');
      if (!secretKey) {
        return Response.json({ error: 'This club has not connected Stripe yet — pay by invoice instead.' }, { status: 400 });
      }

      const entity = await svc.entities.BillingEntity.get(invoice.billing_entity_id).catch(() => null);
      const appUrl = req.headers.get('x-base44-app-url') || 'https://club-rudder-os.base44.app';

      const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: entity?.contact_email || undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: (invoice.currency || 'USD').toLowerCase(),
              unit_amount: Math.round(balance * 100),
              product_data: {
                name: `Invoice ${invoice.invoice_number}`,
                description: invoice.period_label || 'Facility rental',
              },
            },
          },
        ],
        success_url: `${appUrl}/MyInvoices?paid=1&invoice=${invoice.id}`,
        cancel_url: `${appUrl}/MyInvoices`,
        metadata: { invoice_id: invoice.id, club_id: invoice.club_id, invoice_number: invoice.invoice_number },
        payment_intent_data: { metadata: { invoice_id: invoice.id, club_id: invoice.club_id } },
      });

      await svc.entities.Invoice.update(invoice.id, {
        stripe_session_id: session.id,
        stripe_checkout_url: session.url,
        ...(invoice.status === 'draft' ? { status: 'sent', sent_at: new Date().toISOString() } : {}),
      });

      return Response.json({ ok: true, url: session.url });
    }

    if (action === 'sync_stripe_payment') {
      const invoice = await svc.entities.Invoice.get(String(body.invoice_id || '')).catch(() => null);
      if (!invoice || invoice.status === 'void') {
        return Response.json({ error: 'Invoice not found' }, { status: 404 });
      }
      const isClubManager = invoice.club_id === user.club_id && canManage(user);
      const isEntityContact = !!user.billing_entity_id && user.billing_entity_id === invoice.billing_entity_id;
      if (!isClubManager && !isEntityContact) {
        return Response.json({ error: 'You do not have access to this invoice' }, { status: 403 });
      }

      const secretKey = (await getStripeSecretKey(base44, invoice.club_id)) || secrets.get('STRIPE_SECRET_KEY');
      if (!secretKey) {
        return Response.json({ error: 'Payments are not connected for this club yet.' }, { status: 400 });
      }

      const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
      const session = invoice.stripe_session_id
        ? await stripe.checkout.sessions.retrieve(invoice.stripe_session_id).catch(() => null)
        : null;
      if (!session) {
        return Response.json({ ok: true, paid: false, reason: 'No Stripe payment has been started for this invoice yet.' });
      }
      if (session.payment_status !== 'paid') {
        return Response.json({ ok: true, paid: false, reason: 'Stripe has not confirmed this payment yet.' });
      }

      const reference = session.payment_intent || session.id;
      const already = entityRows(await svc.entities.PaymentRecord.filter({ invoice_id: invoice.id, reference }, { limit: 1 }));
      if (invoice.status === 'paid' || already.length) {
        return Response.json({ ok: true, paid: true, already_recorded: true });
      }

      const amount = round2(Number(session.amount_total || 0) / 100);
      await recordFacilityPayment(svc, {
        invoice,
        amount,
        method: 'stripe',
        reference,
        recordedBy: 'stripe-sync',
        notes: `Stripe checkout ${session.id}`,
        currency: invoice.currency || 'USD',
      });
      await svc.entities.Invoice.update(invoice.id, {
        stripe_session_id: session.id,
        ...(session.payment_intent ? { stripe_payment_intent_id: session.payment_intent } : {}),
      });

      const updated = await svc.entities.Invoice.get(invoice.id).catch(() => null);
      return Response.json({ ok: true, paid: true, invoice: updated });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('facility-invoice-portal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}