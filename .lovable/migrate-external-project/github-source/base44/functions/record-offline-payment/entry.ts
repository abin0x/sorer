import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { recordOfflinePayment } from '../../shared/offlinePayment.ts';

// Admin tool: records an offline (cash, check, or other) payment against a
// Registration, TryoutFinalRegistration, or EventRegistration. Writes a Payment
// ledger entry and updates the source's running balance so the ledger, family
// account, and QuickBooks sync all reflect it.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && !user.is_super_admin) {
      return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { source_type, source_id, amount, payment_method, payment_date, notes } = body;

    const result = await recordOfflinePayment(base44.asServiceRole, {
      source_type,
      source_id,
      amount: Number(amount),
      payment_method,
      payment_date,
      notes,
      recorded_by: user.email,
    });

    return Response.json({ ok: true, payment: result.payment });
  } catch (error) {
    console.error('record-offline-payment error:', error);
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}