import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getClubQbConnection, findOrCreateCustomer, nextInvoiceNumber, qbPost } from '../../shared/quickbooksApi.ts';
import { logAudit } from '../../shared/auditLog.ts';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'bookkeeper'];

function canSync(user) {
  return user && (user.role === 'admin' || ADMIN_ROLES.includes(user.custom_role));
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canSync(user)) return Response.json({ error: 'Forbidden — finance access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { payment_ids, since_date } = body;

    // Load payments to sync. Either explicit IDs, or all paid since a date.
    let payments = [];
    if (Array.isArray(payment_ids) && payment_ids.length > 0) {
      for (const id of payment_ids) {
        const p = await base44.asServiceRole.entities.Payment.get(id);
        if (p) payments.push(p);
      }
    } else {
      const filter = since_date
        ? { status: 'paid_in_full', payment_date: { $gte: since_date } }
        : { status: 'paid_in_full' };
      payments = await base44.asServiceRole.entities.Payment.filter(filter, '-created_date', 50);
    }

    if (payments.length === 0) {
      return Response.json({ success: true, message: 'No paid payments to sync.', synced: 0, results: [] });
    }

    const qb = await getClubQbConnection(base44, user.club_id);
    const results = [];

    for (const payment of payments) {
      try {
        // Skip already-synced payments (QB invoice ID stored in transaction_reference)
        if (payment.transaction_reference && payment.transaction_reference.startsWith('QB-')) {
          results.push({ payment_id: payment.id, status: 'skipped', message: 'Already synced' });
          continue;
        }

        // Resolve guardian for customer creation
        let guardian = null;
        if (payment.source_type === 'registration') {
          const reg = await base44.asServiceRole.entities.Registration.get(payment.source_id).catch(() => null);
          if (reg?.guardian_id) {
            guardian = await base44.asServiceRole.entities.Guardian.get(reg.guardian_id).catch(() => null);
          }
        }

        const customerName = payment.guardian_name || guardian?.first_name + ' ' + guardian?.last_name || payment.player_name || 'Club Customer';
        const customerEmail = guardian?.email || `player-${payment.player_id}@club.local`;
        const customerPhone = guardian?.phone;

        const customer = await findOrCreateCustomer(qb, {
          displayName: customerName,
          email: customerEmail,
          phone: customerPhone,
        });

        const customerId = customer?.Id || customer?.id;
        if (!customerId) throw new Error('Failed to resolve QuickBooks customer');

        // Create invoice
        const docNumber = await nextInvoiceNumber(qb);
        const today = new Date().toISOString().split('T')[0];
        const invoiceBody = {
          DocNumber: docNumber,
          CustomerRef: { value: String(customerId) },
          TxnDate: today,
          DueDate: today,
          Line: [
            {
              Amount: Number(payment.amount || 0),
              DetailType: 'SalesItemLineDetail',
              SalesItemLineDetail: {
                ItemRef: { value: '1', name: 'Club Services' },
                Qty: 1,
                UnitPrice: Number(payment.amount || 0),
              },
              Description: payment.source_label || payment.notes || 'Club registration payment',
            },
          ],
        };
        const invRes = await qbPost(qb, 'invoice', invoiceBody);
        const invoice = invRes?.Invoice;
        const invoiceId = invoice?.Id;
        if (!invoiceId) throw new Error('Invoice creation returned no ID');

        // Create payment against the invoice
        const paymentBody = {
          CustomerRef: { value: String(customerId) },
          TotalAmt: Number(payment.amount || 0),
          TxnDate: payment.payment_date || today,
          Line: [
            {
              Amount: Number(payment.amount || 0),
              LinkedTxn: [{ TxnId: invoiceId, TxnType: 'Invoice' }],
            },
        ],
        };
        const payRes = await qbPost(qb, 'payment', paymentBody);

        // Mark payment as synced
        await base44.asServiceRole.entities.Payment.update(payment.id, {
          transaction_reference: `QB-${invoiceId}`,
        });

        results.push({
          payment_id: payment.id,
          status: 'synced',
          invoice_id: invoiceId,
          invoice_number: docNumber,
          customer_id: customerId,
        });
      } catch (err) {
        results.push({ payment_id: payment.id, status: 'failed', error: err.message });
      }
    }

    const synced = results.filter((r) => r.status === 'synced').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    await logAudit(base44, {
      club_id: user.club_id,
      user,
      action: failed > 0 && synced === 0 ? 'quickbooks_sync_failed' : 'quickbooks_sync_completed',
      entity_type: 'Payment',
      metadata: { synced, failed },
    });
    return Response.json({
      success: true,
      synced,
      failed,
      skipped: results.filter((r) => r.status === 'skipped').length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}