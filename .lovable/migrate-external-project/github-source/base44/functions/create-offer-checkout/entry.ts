import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';

// Public: validates a cart against the Offer catalog, creates a
// MarketplaceOrder (status=pending), and creates a Stripe Checkout
// Session on the club's own Stripe account (direct charge, zero
// platform fee). Supports guest and signed-in checkout.
//
// Cart items arrive as:
//   { offer_id, type: 'spiritwear', variant: {size,color,sku}, quantity, custom_name?, custom_number?, fulfillment? }
//   { offer_id, type: 'event', price_option_key, dates?: [...], participant?: {...}, quantity }
//   { offer_id, type: 'dues', payment_plan: 'full'|'monthly'|'split_guardians', player?: {...}, quantity }
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { club_slug, club_id, items, customer } = body;

    if (!club_slug && !club_id) return Response.json({ error: 'Missing club_slug or club_id' }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) return Response.json({ error: 'Cart is empty' }, { status: 400 });
    if (!customer?.email || !customer?.name) return Response.json({ error: 'Customer name and email are required' }, { status: 400 });

    // Resolve club by id (preferred) or slug
    let club: any = null;
    if (club_id) {
      club = await svc.entities.Club.get(club_id).catch(() => null);
    } else {
      const clubs = await svc.entities.Club.filter({ slug: club_slug });
      club = clubs?.[0];
    }
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    const orderItems = [];
    let subtotal = 0;
    let hasRecurring = false;

    for (const item of items) {
      if (!item.offer_id) return Response.json({ error: 'Each cart item needs an offer_id' }, { status: 400 });

      const offer = await svc.entities.Offer.get(item.offer_id).catch(() => null);
      if (!offer || offer.status !== 'active' || offer.club_id !== club.id) {
        return Response.json({ error: `Offer not available: ${item.offer_id}` }, { status: 400 });
      }

      // ── Spiritwear ──────────────────────────────────────────
      if (offer.type === 'spiritwear') {
        const config = offer.config || {};
        const variant = (config.variants || []).find(
          (v) => v.size === item.variant?.size && v.color === item.variant?.color && v.sku === item.variant?.sku,
        );
        if (!variant) return Response.json({ error: `Variant not available for ${offer.name}` }, { status: 400 });
        const qty = Math.max(1, item.quantity || 1);
        if ((variant.stock || 0) < qty) {
          return Response.json({ error: `Not enough stock for ${offer.name} (${variant.size} ${variant.color}). Only ${variant.stock || 0} left.` }, { status: 400 });
        }

        let unitPrice = Number(variant.price || config.base_price || 0);
        // Add custom name/number upcharges
        if (item.custom_name && config.allow_custom_name_number) unitPrice += Number(config.custom_name_price || 0);
        if (item.custom_number && config.allow_custom_name_number) unitPrice += Number(config.custom_number_price || 0);

        orderItems.push({
          type: 'spiritwear',
          reference_id: offer.id,
          name: offer.name,
          variant: { size: variant.size, color: variant.color, sku: variant.sku },
          custom_name: item.custom_name || '',
          custom_number: item.custom_number || '',
          fulfillment: item.fulfillment || 'pickup',
          quantity: qty,
          unit_price: unitPrice,
          line_total: unitPrice * qty,
        });
        subtotal += unitPrice * qty;
      }

      // ── Event ───────────────────────────────────────────────
      else if (offer.type === 'event') {
        const config = offer.config || {};
        const priceOption = (config.price_options || []).find((p) => p.key === item.price_option_key);
        if (!priceOption) return Response.json({ error: `Select a price option for ${offer.name}` }, { status: 400 });

        const qty = Math.max(1, item.quantity || 1);
        const dates = Array.isArray(item.dates) ? item.dates : [];

        let unitPrice = Number(priceOption.price || 0);
        let lineType = 'event';

        // Series / full-range pass — one flat price
        if (priceOption.type === 'series' || priceOption.type === 'full_range') {
          lineType = 'event_series';
        }
        // Per-day / individual — multiply by number of selected dates
        else if (priceOption.type === 'per_day' || priceOption.type === 'individual') {
          if (dates.length === 0) return Response.json({ error: `Select at least one date for ${offer.name}` }, { status: 400 });
          unitPrice = unitPrice * dates.length;
        }
        // Drop-in — single session
        else if (priceOption.type === 'drop_in') {
          if (dates.length === 0) return Response.json({ error: `Select a date for ${offer.name}` }, { status: 400 });
          if (dates.length > 1) dates.splice(1); // drop-in = one session only
        }

        // Early-bird pricing
        const today = new Date().toISOString().split('T')[0];
        if (config.early_bird?.until && today <= config.early_bird.until) {
          const ebPrice = Number(config.early_bird.price || 0);
          if (ebPrice > 0 && ebPrice < unitPrice) {
            // Apply early-bird per unit for per-day, or flat for series
            if (priceOption.type === 'per_day' || priceOption.type === 'individual') {
              unitPrice = ebPrice * dates.length;
            } else {
              unitPrice = ebPrice;
            }
          }
        }

        orderItems.push({
          type: lineType,
          reference_id: offer.id,
          name: offer.name,
          dates,
          price_option: { key: priceOption.key, name: priceOption.name, type: priceOption.type },
          participant: item.participant || null,
          quantity: qty,
          unit_price: unitPrice,
          line_total: unitPrice * qty,
        });
        subtotal += unitPrice * qty;
      }

      // ── Dues ────────────────────────────────────────────────
      else if (offer.type === 'dues') {
        const config = offer.config || {};
        const plan = item.payment_plan || 'full';
        if (!config.payment_plans?.includes(plan)) {
          return Response.json({ error: `Payment plan "${plan}" is not available for ${offer.name}` }, { status: 400 });
        }

        const qty = Math.max(1, item.quantity || 1);
        let unitPrice = Number(config.amount || 0);

        // Early-bird dues
        const today = new Date().toISOString().split('T')[0];
        if (config.early_bird?.until && today <= config.early_bird.until) {
          const ebPrice = Number(config.early_bird.price || 0);
          if (ebPrice > 0) unitPrice = ebPrice;
        }

        // Sibling discount
        if (config.sibling_discount_percent > 0) {
          unitPrice = unitPrice * (1 - config.sibling_discount_percent / 100);
        }

        if (plan === 'monthly') {
          hasRecurring = true;
        }

        // Tag the team (-> QuickBooks Class) and its branch (-> QuickBooks
        // Location) at the source, so the Stripe->QuickBooks sync can post
        // this charge without guessing. Resolved from the dues Offer's team,
        // which gets its Class assigned when the team plan is created.
        let teamId = config.team_id || '';
        let teamName = config.team_name || '';
        let branchId = '';
        let branchName = '';
        if (teamId) {
          const team = await svc.entities.Team.get(teamId).catch(() => null);
          if (team) {
            branchId = team.location_id || '';
            const branch = branchId ? await svc.entities.Location.get(branchId).catch(() => null) : null;
            branchName = branch?.name || '';
          }
        }

        orderItems.push({
          type: 'dues',
          reference_id: offer.id,
          name: offer.name,
          payment_plan: plan,
          player: item.player || null,
          quantity: qty,
          unit_price: unitPrice,
          line_total: unitPrice * qty,
          team_id: teamId,
          team_name: teamName,
          branch_id: branchId,
          branch_name: branchName,
          season: config.season || '',
          charge_type: 'dues',
        });
        subtotal += unitPrice * qty;
      }

      else {
        return Response.json({ error: `Unknown offer type: ${offer.type}` }, { status: 400 });
      }
    }

    // Fee coverage option
    let feeCoverage = 0;
    if (customer.cover_fee && items.some((i) => i.type === 'dues')) {
      // 2.9% + $0.30 per transaction, applied to subtotal
      feeCoverage = Math.round((subtotal * 0.029 + 0.3) * 100) / 100;
    }

    const total = subtotal + feeCoverage;
    if (total < 0.5) return Response.json({ error: 'Order total must be at least $0.50' }, { status: 400 });

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
      fee_coverage: feeCoverage,
      total,
      currency: 'USD',
      status: 'pending',
      checkout_mode: hasRecurring ? 'subscription' : 'payment',
    });

    // Create Stripe Checkout Session on the club's own Stripe account
    const secretKey = await getStripeSecretKey(base44, club.id);
    if (!secretKey) {
      await svc.entities.MarketplaceOrder.update(order.id, { status: 'failed' });
      return Response.json({ error: 'Online payment is not available for this club yet. Please contact the club directly.' }, { status: 400 });
    }

    const appUrl = req.headers.get('X-Base44-App-Url') || process.env.WIX_CHECKOUT_APP_URL || '';
    const base = appUrl.replace(/\/$/, '');
    if (!base) {
      await svc.entities.MarketplaceOrder.update(order.id, { status: 'failed' });
      return Response.json({ error: 'Could not determine app URL for checkout redirect' }, { status: 500 });
    }

    const params = new URLSearchParams();
    params.append('mode', hasRecurring ? 'subscription' : 'payment');
    params.append('success_url', `${base}/MarketplaceCart?step=confirmation&order=${order.id}`);
    params.append('cancel_url', `${base}/MarketplaceCart?canceled=1`);
    params.append('metadata[source_type]', 'offer_order');
    params.append('metadata[order_id]', order.id);
    params.append('metadata[club_id]', club.id);
    if (customer.email) params.append('customer_email', customer.email);

    orderItems.forEach((item, idx) => {
      const prefix = `line_items[${idx}]`;
      let name = item.name;
      if (item.type === 'spiritwear') {
        name += ` (${item.variant?.size || ''} ${item.variant?.color || ''})`.trim();
        if (item.custom_name) name += ` — Name: ${item.custom_name}`;
        if (item.custom_number) name += ` — #${item.custom_number}`;
      }
      if ((item.type === 'event' || item.type === 'event_series') && item.dates?.length) {
        name += ` — ${item.dates.join(', ')}`;
      }
      if (item.type === 'dues') {
        name += ` — ${item.payment_plan === 'monthly' ? 'Monthly Installments' : item.payment_plan === 'split_guardians' ? 'Split Guardians' : 'Pay in Full'}`;
      }

      params.append(`${prefix}[quantity]`, String(item.quantity || 1));
      params.append(`${prefix}[price_data][currency]`, 'usd');
      params.append(`${prefix}[price_data][unit_amount]`, String(Math.round(item.unit_price * 100)));
      params.append(`${prefix}[price_data][product_data][name]`, name);

      // Monthly dues = Stripe subscription (fixed-term schedule handled post-payment)
      if (hasRecurring && item.type === 'dues' && item.payment_plan === 'monthly') {
        params.append(`${prefix}[price_data][recurring][interval]`, 'month');
        params.append(`${prefix}[price_data][recurring][interval_count]`, '1');
      }
    });

    // Fee coverage as a separate line item
    if (feeCoverage > 0) {
      const idx = orderItems.length;
      const prefix = `line_items[${idx}]`;
      params.append(`${prefix}[quantity]`, '1');
      params.append(`${prefix}[price_data][currency]`, 'usd');
      params.append(`${prefix}[price_data][unit_amount]`, String(Math.round(feeCoverage * 100)));
      params.append(`${prefix}[price_data][product_data][name]`, 'Processing Fee Coverage');
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const session = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('create-offer-checkout: stripe error', session);
      await svc.entities.MarketplaceOrder.update(order.id, { status: 'failed' });
      return Response.json({ error: session?.error?.message || 'Could not start checkout' }, { status: 400 });
    }

    await svc.entities.MarketplaceOrder.update(order.id, {
      stripe_checkout_session_id: session.id,
    });

    return Response.json({ checkout_url: session.url, order_id: order.id });
  } catch (error) {
    console.error('create-offer-checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}