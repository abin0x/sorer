// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'branch_director', 'branch_admin', 'bookkeeper'];

function canProcess(user) {
  return user && (user.role === 'admin' || ADMIN_ROLES.includes(user.custom_role));
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canProcess(user)) return Response.json({ error: 'Forbidden — staff access required' }, { status: 403 });

    const body = await req.json();
    const { processor_id, amount, currency = 'usd', payment_method_token, description, metadata } = body;

    if (!processor_id || !amount || !payment_method_token) {
      return Response.json({ error: 'processor_id, amount, and payment_method_token are required' }, { status: 400 });
    }

    const processor = await base44.asServiceRole.entities.PaymentProcessor.get(processor_id);
    if (!processor) return Response.json({ error: 'Processor not found' }, { status: 404 });
    if (!processor.is_active) return Response.json({ error: 'Processor is inactive' }, { status: 400 });
    if (!processor.secret_key) return Response.json({ error: 'Processor has no API credentials configured' }, { status: 400 });

    // ---- Stripe ----
    if (processor.processor_type === 'stripe') {
      const params = new URLSearchParams();
      params.append('amount', String(Math.round(Number(amount) * 100)));
      params.append('currency', currency.toLowerCase());
      params.append('payment_method', payment_method_token);
      params.append('confirm', 'true');
      if (description) params.append('description', description);
      if (metadata) {
        for (const [k, v] of Object.entries(metadata)) {
          params.append(`metadata[${k}]`, String(v));
        }
      }

      const res = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${processor.secret_key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return Response.json({ error: data?.error?.message || 'Stripe payment failed' }, { status: 400 });
      }
      return Response.json({
        success: true,
        transaction_id: data.id,
        status: data.status,
        processor: 'stripe',
      });
    }

    // ---- Square ----
    if (processor.processor_type === 'square') {
      if (!processor.location_id) {
        return Response.json({ error: 'Square requires a Location ID to charge' }, { status: 400 });
      }
      const baseUrl = processor.environment === 'live'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';
      const payload = {
        source_id: payment_method_token,
        amount_money: {
          amount: Math.round(Number(amount) * 100),
          currency: currency.toUpperCase(),
        },
        location_id: processor.location_id,
        note: description || undefined,
      };
      const res = await fetch(`${baseUrl}/v2/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${processor.secret_key}`,
          'Square-Version': '2024-08-21',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.errors?.[0]?.detail || 'Square payment failed';
        return Response.json({ error: detail }, { status: 400 });
      }
      return Response.json({
        success: true,
        transaction_id: data.payment?.id,
        status: data.payment?.status,
        processor: 'square',
      });
    }

    // ---- Payment Depot ----
    if (processor.processor_type === 'payment_depot') {
      const payload = {
        amount: Number(amount).toFixed(2),
        currency: currency.toUpperCase(),
        payment_method_token,
        description: description || undefined,
      };
      const res = await fetch('https://api.paymentdepot.com/api/v1/Charge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${processor.secret_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return Response.json({ error: data?.message || data?.error || 'Payment Depot charge failed' }, { status: 400 });
      }
      return Response.json({
        success: true,
        transaction_id: data.transactionId || data.id,
        status: data.status || 'succeeded',
        processor: 'payment_depot',
      });
    }

    return Response.json({ error: `Processing not implemented for ${processor.processor_type}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}