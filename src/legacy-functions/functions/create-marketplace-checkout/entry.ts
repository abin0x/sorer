// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';

// Public: validates a cart, creates a MarketplaceOrder (status=pending), and
// creates a Stripe Checkout Session on the club's own Stripe account. Returns
// { checkout_url, order_id }. Supports guest and signed-in checkout.
//
// Cart items arrive as:
//   { type: 'subscription', reference_id, quantity }
//   { type: 'event', reference_id, dates: ['2026-10-15'], quantity }
//   { type: 'event_series', reference_id, quantity }
//   { type: 'event_bulk', reference_id, quantity }
//   { type: 'spiritwear', reference_id, variant: {size,color,sku}, quantity }
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { club_slug, items, customer } = body;

    if (!club_slug) return Response.json({ error: 'Missing club_slug' }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) return Response.json({ error: 'Cart is empty' }, { status: 400 });
    if (!customer?.email || !customer?.name) return Response.json({ error: 'Customer name and email are required' }, { status: 400 });

    // Resolve club
    const clubs = await svc.entities.Club.filter({ slug: club_slug });
    const club = clubs?.[0];
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    // Validate each item and build order line items
    const orderItems = [];
    let subtotal = 0;
    const hasRecurringSubscription = [];

    for (const item of items) {
      if (!item.type || !item.reference_id) {
        return Response.json({ error: 'Each cart item needs a type and reference_id' }, { status: 400 });
      }

      if (item.type === 'subscription') {
        const sub = await svc.entities.ClubSubscription.get(item.reference_id).catch(() => null);
        if (!sub || sub.status !== 'active' || sub.club_id !== club.id) {
          return Response.json({ error: `Subscription not available: ${item.reference_id}` }, { status: 400 });
        }
        const qty = Math.max(1, item.quantity || 1);
        const unitPrice = Number(sub.price || 0);
        orderItems.push({
          type: 'subscription',
          reference_id: sub.id,
          name: sub.name,
          quantity: qty,
          unit_price: unitPrice,
          line_total: unitPrice * qty,
        });
        subtotal += unitPrice * qty;
        if (sub.billing_interval === 'monthly' || sub.billing_interval === 'yearly') {
          hasRecurringSubscription.push(sub);
        }
      }

      else if (item.type === 'event' || item.type === 'event_series' || item.type === 'event_bulk') {
        const ev = await svc.entities.ClubEvent.get(item.reference_id).catch(() => null);
        if (!ev || ev.club_id !== club.id || !ev.marketplace_enabled) {
          return Response.json({ error: `Event not available: ${item.reference_id}` }, { status: 400 });
        }
        if (ev.status !== 'open' && ev.status !== 'full') {
          return Response.json({ error: `${ev.name} is not open for registration` }, { status: 400 });
        }
        const today = new Date().toISOString().split('T')[0];
        if (ev.registration_closes && today > ev.registration_closes) {
          return Response.json({ error: `Registration for ${ev.name} has closed` }, { status: 400 });
        }

        const qty = Math.max(1, item.quantity || 1);
        const dates = Array.isArray(item.dates) ? item.dates : [];

        if (item.type === 'event') {
          // Per-occurrence / per-day purchase
          if (dates.length === 0) return Response.json({ error: `Select at least one date for ${ev.name}` }, { status: 400 });
          const unitPrice = Number(ev.price || 0);
          const lineTotal = unitPrice * dates.length * qty;
          orderItems.push({
            type: 'event',
            reference_id: ev.id,
            name: ev.name,
            dates,
            quantity: qty,
            unit_price: unitPrice,
            line_total: lineTotal,
          });
          subtotal += lineTotal;
        }

        else if (item.type === 'event_series') {
          // Full recurring-series pass
          let seriesPrice = Number(ev.series_price || 0);
          if (seriesPrice <= 0) {
            // Calculate as price × number of occurrences
            let numDates = dates.length;
            if (numDates === 0 && ev.scheduling_event_id) {
              const occs = await svc.entities.EventOccurrence.filter({ event_id: ev.scheduling_event_id, status: 'scheduled' }, 'occurrence_date', 500).catch(() => []);
              numDates = (occs || []).filter((o) => o.occurrence_date >= today).length;
            }
            seriesPrice = Number(ev.price || 0) * Math.max(1, numDates);
          }
          orderItems.push({
            type: 'event_series',
            reference_id: ev.id,
            name: ev.name,
            dates,
            quantity: qty,
            unit_price: seriesPrice,
            line_total: seriesPrice * qty,
          });
          subtotal += seriesPrice * qty;
        }

        else if (item.type === 'event_bulk') {
          // Full multi-day bulk pass
          let bulkPrice = Number(ev.bulk_price || 0);
          if (bulkPrice <= 0) {
            let numDays = dates.length;
            if (numDays === 0 && ev.scheduling_event_id) {
              const occs = await svc.entities.EventOccurrence.filter({ event_id: ev.scheduling_event_id, status: 'scheduled' }, 'occurrence_date', 500).catch(() => []);
              numDays = (occs || []).filter((o) => o.occurrence_date >= today).length;
            }
            bulkPrice = Number(ev.price || 0) * Math.max(1, numDays);
          }
          orderItems.push({
            type: 'event_bulk',
            reference_id: ev.id,
            name: ev.name,
            dates,
            quantity: qty,
            unit_price: bulkPrice,
            line_total: bulkPrice * qty,
          });
          subtotal += bulkPrice * qty;
        }
      }

      else if (item.type === 'spiritwear') {
        const product = await svc.entities.SpiritwearProduct.get(item.reference_id).catch(() => null);
        if (!product || product.status !== 'active' || product.club_id !== club.id) {
          return Response.json({ error: `Product not available: ${item.reference_id}` }, { status: 400 });
        }
        const variant = (product.variants || []).find(
          (v) => v.size === item.variant?.size && v.color === item.variant?.color && v.sku === item.variant?.sku
        );
        if (!variant) return Response.json({ error: `Variant not available for ${product.name}` }, { status: 400 });
        const qty = Math.max(1, item.quantity || 1);
        if ((variant.stock || 0) < qty) {
          return Response.json({ error: `Not enough stock for ${product.name} (${variant.size || ''} ${variant.color || ''}). Only ${variant.stock || 0} left.` }, { status: 400 });
        }
        const unitPrice = Number(variant.price || product.base_price || 0);
        orderItems.push({
          type: 'spiritwear',
          reference_id: product.id,
          name: product.name,
          variant: { size: variant.size, color: variant.color, sku: variant.sku },
          quantity: qty,
          unit_price: unitPrice,
          line_total: unitPrice * qty,
        });
        subtotal += unitPrice * qty;
      }

      else {
        return Response.json({ error: `Unknown item type: ${item.type}` }, { status: 400 });
      }
    }

    // Determine checkout mode
    const hasOneOffItems = orderItems.some((i) => i.type !== 'subscription' || !hasRecurringSubscription.find((s) => s.id === i.reference_id));
    const checkoutMode = hasRecurringSubscription.length > 0 ? 'subscription' : 'payment';

    // Stripe can't mix modes — if there are recurring subscriptions AND one-off items, error
    if (hasRecurringSubscription.length > 0 && orderItems.some((i) => !hasRecurringSubscription.find((s) => s.id === i.reference_id))) {
      return Response.json({ error: 'Recurring subscriptions must be checked out separately from event registrations and spiritwear. Please remove one or the other from your cart.' }, { status: 400 });
    }

    if (subtotal < 0.5) {
      return Response.json({ error: 'Order total must be at least $0.50' }, { status: 400 });
    }

    // Create the MarketplaceOrder (pending)
    const orderNum = `MKT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const order = await svc.entities.MarketplaceOrder.create({
      club_id: club.id,
      order_number: orderNum,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || '',
      user_id: customer.user_id || null,
      items: orderItems,
      subtotal,
      total: subtotal,
      currency: 'USD',
      status: 'pending',
      checkout_mode: checkoutMode,
    });

    // Create Stripe Checkout Session
    const secretKey = await getStripeSecretKey(base44, club.id);
    if (!secretKey) {
      await svc.entities.MarketplaceOrder.update(order.id, { status: 'failed' });
      return Response.json({ error: 'Online payment is not available for this club yet. Please contact the club directly.' }, { status: 400 });
    }

    const appUrl = req.headers.get('X-Base44-App-Url') || process.env.WIX_CHECKOUT_APP_URL || '';
    const base = appUrl.replace(/\/$/, '');
    const params = new URLSearchParams();
    params.append('mode', checkoutMode);
    params.append('success_url', `${base}/Marketplace?paid=1&order=${order.id}`);
    params.append('cancel_url', `${base}/MarketplaceCart?canceled=1`);
    params.append('metadata[source_type]', 'marketplace_order');
    params.append('metadata[order_id]', order.id);
    params.append('metadata[club_id]', club.id);
    if (customer.email) params.append('customer_email', customer.email);

    orderItems.forEach((item, idx) => {
      const prefix = `line_items[${idx}]`;
      const name = item.type === 'spiritwear'
        ? `${item.name} (${item.variant?.size || ''} ${item.variant?.color || ''}).trim()`
        : item.type === 'event'
          ? `${item.name} (${item.dates?.join(', ') || ''})`
          : item.type === 'event_series'
            ? `${item.name} — Series Pass`
            : item.type === 'event_bulk'
              ? `${item.name} — All Days Pass`
              : item.name;
      params.append(`${prefix}[quantity]`, String(item.quantity || 1));

      if (checkoutMode === 'subscription') {
        // Inline recurring price for subscriptions
        const sub = hasRecurringSubscription.find((s) => s.id === item.reference_id);
        const interval = sub?.billing_interval === 'yearly' ? 'year' : 'month';
        params.append(`${prefix}[price_data][currency]`, 'usd');
        params.append(`${prefix}[price_data][recurring][interval]`, interval);
        params.append(`${prefix}[price_data][recurring][interval_count]`, '1');
        params.append(`${prefix}[price_data][unit_amount]`, String(Math.round(item.unit_price * 100)));
        params.append(`${prefix}[price_data][product_data][name]`, name);
      } else {
        params.append(`${prefix}[price_data][currency]`, 'usd');
        params.append(`${prefix}[price_data][unit_amount]`, String(Math.round(item.unit_price * 100)));
        params.append(`${prefix}[price_data][product_data][name]`, name);
      }
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const session = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('create-marketplace-checkout: stripe error', session);
      await svc.entities.MarketplaceOrder.update(order.id, { status: 'failed' });
      return Response.json({ error: session?.error?.message || 'Could not start checkout' }, { status: 400 });
    }

    await svc.entities.MarketplaceOrder.update(order.id, {
      stripe_checkout_session_id: session.id,
    });

    return Response.json({ checkout_url: session.url, order_id: order.id });
  } catch (error) {
    console.error('create-marketplace-checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}