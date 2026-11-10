// @ts-nocheck
// Echelon checkout, second half. Two actions, both keyed by the order id:
//  - "form": returns the secure gateway address the card form posts to.
//  - "complete": after the gateway sends the family back with a token, finish
//    the sale with the club's own security key and mark the order paid only if
//    the gateway approved it for this exact order and amount.
import { createClientFromRequest } from '@/legacy-functions/_sdk';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const { action, order_id, token_id } = await req.json().catch(() => ({}));
    if (typeof order_id !== 'string' || !/^[\w-]{6,64}$/.test(order_id)) return Response.json({ error: 'Order not found' }, { status: 404 });
    const order = await svc.entities.MarketplaceOrder.get(order_id).catch(() => null);
    if (!order || order.payment_provider !== 'echelon') return Response.json({ error: 'Order not found' }, { status: 404 });
    const summary = { order_number: order.order_number, total: order.total, currency: order.currency, status: order.status, items: (order.items || []).map((i) => ({ name: i.name, line_total: i.line_total })) };

    if (action === 'form') {
      if (order.status !== 'pending') return Response.json({ ...summary, form_url: null });
      return Response.json({ ...summary, form_url: order.processor_form_url });
    }
    if (action !== 'complete') return Response.json({ error: 'Unknown action' }, { status: 400 });
    if (order.status === 'paid') return Response.json({ ...summary, status: 'paid' });
    if (order.status !== 'pending') return Response.json({ error: 'This order can no longer be paid.' }, { status: 400 });
    if (typeof token_id !== 'string' || !/^[\w-]{8,128}$/.test(token_id)) return Response.json({ error: 'Missing payment token' }, { status: 400 });

    const { getSecret } = await import('@/lib/integrations.server');
    const secret = await getSecret(order.club_id, 'echelon');
    if (!secret?.security_key) return Response.json({ error: 'Echelon is not connected for this club.' }, { status: 400 });
    const { echelonCompleteSale } = await import('@/lib/echelon.server');
    const r = await echelonCompleteSale(secret.security_key, token_id);
    const amountOk = Math.abs(Number(r.amount) - Number(order.total)) < 0.005;
    if (r.result !== '1' || r.orderId !== order.id || !amountOk) {
      await svc.entities.MarketplaceOrder.update(order.id, { status: r.result === '1' ? 'review' : 'pending' });
      return Response.json({ error: r.text || 'The card was declined. Please try again.' }, { status: 402 });
    }
    await svc.entities.MarketplaceOrder.update(order.id, { status: 'paid', paid_at: new Date().toISOString(), processor_transaction_id: r.transactionId, processor_form_url: null });
    return Response.json({ ...summary, status: 'paid' });
  } catch (error) {
    console.error('echelon-complete error:', error?.message);
    return Response.json({ error: 'Payment could not be completed. Please contact the club.' }, { status: 500 });
  }
}
