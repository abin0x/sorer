import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin'];

function isAdmin(user) {
  return user && (user.role === 'admin' || ADMIN_ROLES.includes(user.custom_role));
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });

    const body = await req.json();
    const { processor_id, credentials, processor_type, environment } = body;

    let creds = credentials || {};
    let pType = processor_type;
    let env = environment;

    if (processor_id) {
      const processor = await base44.asServiceRole.entities.PaymentProcessor.get(processor_id);
      if (!processor) return Response.json({ error: 'Processor not found' }, { status: 404 });
      creds = {
        secret_key: processor.secret_key,
        publishable_key: processor.publishable_key,
        webhook_secret: processor.webhook_secret,
        location_id: processor.location_id,
      };
      pType = processor.processor_type;
      env = processor.environment;
    }

    if (!creds.secret_key) {
      return Response.json({ success: false, error: 'Missing API key / secret key' });
    }

    // ---- Stripe ----
    if (pType === 'stripe') {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { 'Authorization': `Bearer ${creds.secret_key}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return Response.json({ success: false, error: data?.error?.message || 'Stripe credentials invalid' });
      }
      return Response.json({
        success: true,
        message: 'Stripe connection successful',
        details: {
          available: data.available?.[0]?.amount ? (data.available[0].amount / 100) : null,
          currency: data.available?.[0]?.currency?.toUpperCase(),
        },
      });
    }

    // ---- Square ----
    if (pType === 'square') {
      const baseUrl = env === 'live'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';
      const res = await fetch(`${baseUrl}/v2/locations`, {
        headers: {
          'Authorization': `Bearer ${creds.secret_key}`,
          'Square-Version': '2024-08-21',
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.errors?.[0]?.detail || data?.errors?.[0]?.code || 'Square credentials invalid';
        return Response.json({ success: false, error: detail });
      }
      const locations = data.locations || [];
      return Response.json({
        success: true,
        message: `Square connection successful — ${locations.length} location(s) found`,
        details: {
          locations: locations.map((l: any) => ({ id: l.id, name: l.name })),
        },
      });
    }

    // ---- Payment Depot ----
    if (pType === 'payment_depot') {
      const res = await fetch('https://api.paymentdepot.com/api/v1/Balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${creds.secret_key}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.status === 401 || res.status === 403) {
        return Response.json({ success: false, error: 'Payment Depot credentials invalid' });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return Response.json({ success: false, error: data?.message || data?.error || 'Payment Depot credentials invalid' });
      }
      return Response.json({
        success: true,
        message: 'Payment Depot connection successful',
        details: { balance: data.balance || data.availableBalance || null },
      });
    }

    // ---- Stax ----
    if (pType === 'stax') {
      const res = await fetch('https://apiprod.fattlabs.com/customer', {
        headers: {
          'Authorization': `Bearer ${creds.secret_key}`,
        },
      });
      if (!res.ok) {
        return Response.json({ success: false, error: 'Stax credentials invalid' });
      }
      return Response.json({ success: true, message: 'Stax connection successful' });
    }

    if (pType === 'manual') {
      return Response.json({ success: true, message: 'Manual processor — no credentials to test' });
    }

    return Response.json({ success: false, error: `Unsupported processor type: ${pType}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}