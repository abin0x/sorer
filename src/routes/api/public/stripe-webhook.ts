import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/stripe-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signingSecret = process.env['STRIPE_WEBHOOK_SECRET'];
        if (!signingSecret) return Response.json({ error: 'Webhook not configured.' }, { status: 503 });
        const signature = request.headers.get('stripe-signature');
        if (!signature) return Response.json({ error: 'Invalid signature.' }, { status: 400 });
        const { verifyStripeEvent, stripeEventAccount } = await import('@/lib/stripeTenant.server');
        let event;
        try {
          event = await verifyStripeEvent(await request.text(), signature, signingSecret);
        } catch {
          return Response.json({ error: 'Invalid signature.' }, { status: 400 });
        }
        const account = stripeEventAccount(event);
        if (!account) return Response.json({ received: true });
        // Only after signature verification may privileged storage be accessed.
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const db = supabaseAdmin as any;
        const { data: rows, error } = await db.from('club_integrations')
          .select('id,club_id,external_account_id,status').eq('provider', 'stripe').eq('external_account_id', account);
        if (error) return Response.json({ error: 'Connection lookup unavailable.' }, { status: 503 });
        // Account must resolve to exactly one tenant; never choose the first match.
        if (!rows?.length) return Response.json({ received: true });
        if (rows.length !== 1) return Response.json({ error: 'Ambiguous connection ownership.' }, { status: 409 });
        if (event.type === 'account.application.deauthorized') {
          const { error: updateError } = await db.from('club_integrations')
            .update({ status: 'disconnected' }).eq('id', rows[0].id).eq('club_id', rows[0].club_id)
            .eq('external_account_id', account).eq('provider', 'stripe');
          if (updateError) return Response.json({ error: 'Connection update unavailable.' }, { status: 503 });
        }
        // Marketplace/dues checkout paid on this club's own account: mark the
        // order paid only when the order belongs to the club that owns the account.
        if (event.type === 'checkout.session.completed') {
          const session: any = (event as any).data?.object || {};
          const orderId = session.metadata?.order_id;
          if (session.metadata?.source_type === 'offer_order' && typeof orderId === 'string' && session.payment_status === 'paid') {
            const { error: orderError } = await db.from('marketplace_orders')
              .update({ status: 'paid', paid_at: new Date().toISOString(), processor_transaction_id: session.payment_intent || session.id, payment_provider: 'stripe' })
              .eq('id', orderId).eq('club_id', rows[0].club_id).eq('stripe_checkout_session_id', session.id);
            if (orderError) return Response.json({ error: 'Order update unavailable.' }, { status: 503 });
          }
        }
        // Other events deliberately have no financial side effects.
        return Response.json({ received: true });
      },
    },
  },
});