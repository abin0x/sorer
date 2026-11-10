import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';

// Admin tool: refunds a payment. If the original payment was collected via
// Stripe (has a transaction_reference that looks like a charge id), issues a
// Stripe refund. Writes a negative Payment ledger entry (is_refund: true)
// linked to the original, and reverses the balance on the source record.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && !user.is_super_admin) {
      return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { payment_id, amount, notes } = body;
    if (!payment_id || !(amount > 0)) {
      return Response.json({ error: 'payment_id and a positive amount are required' }, { status: 400 });
    }
    const svc = base44.asServiceRole;
    const original = await svc.entities.Payment.get(payment_id).catch(() => null);
    if (!original) return Response.json({ error: 'Payment not found' }, { status: 404 });
    if (original.is_refund) return Response.json({ error: 'Cannot refund a refund entry' }, { status: 400 });

    const refundAmount = Math.min(Number(amount), Number(original.amount || 0));
    const today = new Date().toISOString().split('T')[0];
    let refundRef = `manual-${Date.now()}`;

    // If the original was a Stripe charge, issue a real refund through Stripe.
    const stripeRef = original.transaction_reference || '';
    if (stripeRef && stripeRef.startsWith('ch_') || stripeRef.startsWith('pi_')) {
      const secretKey = await getStripeSecretKey(base44, original.club_id);
      if (!secretKey) return Response.json({ error: 'Club Stripe key not available' }, { status: 400 });
      const params = new URLSearchParams();
      // Charge id (ch_) is the refund target; for pi_ we refund the payment intent.
      if (stripeRef.startsWith('ch_')) params.append('charge', stripeRef);
      else params.append('payment_intent', stripeRef);
      params.append('amount', String(Math.round(refundAmount * 100)));
      const r = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const refund = await r.json().catch(() => ({}));
      if (!r.ok) return Response.json({ error: refund?.error?.message || 'Stripe refund failed' }, { status: 502 });
      refundRef = refund.id;
    }

    // Write the refund ledger entry.
    const refundEntry = await svc.entities.Payment.create({
      club_id: original.club_id,
      source_type: original.source_type,
      source_id: original.source_id,
      source_label: `Refund: ${original.source_label || ''}`,
      player_id: original.player_id,
      player_name: original.player_name,
      guardian_name: original.guardian_name,
      amount: -refundAmount,
      currency: original.currency || 'USD',
      processor_name: original.processor_name,
      payment_method: original.payment_method,
      status: 'refunded',
      transaction_reference: refundRef,
      payment_date: today,
      recorded_by: user.email,
      is_refund: true,
      original_payment_id: payment_id,
      notes: notes || `Refund of ${original.transaction_reference || 'payment'}`,
    });

    // Mark the original as refunded and reverse the source balance.
    await svc.entities.Payment.update(payment_id, { status: 'refunded' });
    await reverseSourceBalance(svc, original, refundAmount);

    return Response.json({ ok: true, refund: refundEntry });
  } catch (error) {
    console.error('process-refund error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function reverseSourceBalance(svc, original, refundAmount) {
  const st = original.source_type;
  if (st === 'registration') {
    const reg = await svc.entities.Registration.get(original.source_id).catch(() => null);
    if (reg) {
      const newPaid = Math.max(0, Number(reg.amount_paid || 0) - refundAmount);
      await svc.entities.Registration.update(original.source_id, { amount_paid: newPaid, payment_status: newPaid <= 0 ? 'unpaid' : 'partial' });
    }
  } else if (st === 'tryout_event') {
    const inv = await svc.entities.TryoutFinalRegistration.get(original.source_id).catch(() => null);
    if (inv) {
      const newPaid = Math.max(0, Number(inv.amount_paid || 0) - refundAmount);
      await svc.entities.TryoutFinalRegistration.update(original.source_id, { amount_paid: newPaid, payment_status: newPaid <= 0 ? 'unpaid' : 'partial' });
    }
  } else if (st === 'club_event') {
    const ev = await svc.entities.EventRegistration.get(original.source_id).catch(() => null);
    if (ev) {
      const newPaid = Math.max(0, Number(ev.amount_paid || 0) - refundAmount);
      await svc.entities.EventRegistration.update(original.source_id, { amount_paid: newPaid, payment_status: newPaid <= 0 ? 'unpaid' : 'partial' });
    }
  } else if (st === 'tryout_registration') {
    const reg = await svc.entities.TryoutRegistration.get(original.source_id).catch(() => null);
    if (reg) {
      const newPaid = Math.max(0, Number(reg.amount_paid || 0) - refundAmount);
      await svc.entities.TryoutRegistration.update(original.source_id, {
        amount_paid: newPaid,
        payment_status: newPaid <= 0 ? 'refunded' : 'partially_paid',
        refund_status: 'issued',
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
      });
    }
  }
}