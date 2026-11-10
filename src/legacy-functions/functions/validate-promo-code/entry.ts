// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { validatePromoCode } from '../../shared/promoCodes.ts';

// Public helper: previews a promo code's discount for a given purchase so the
// UI can show the updated total before sending the buyer to Stripe Checkout.
// Does NOT increment usage — that happens only on a successful checkout.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { club_id, code, source_type, amount } = body;
    if (!club_id || !code) return Response.json({ valid: false, error: 'Missing code' }, { status: 400 });

    const result = await validatePromoCode(base44, club_id, code, source_type || 'all', Number(amount) || 0);
    return Response.json(result);
  } catch (error) {
    console.error('validate-promo-code error:', error);
    return Response.json({ valid: false, error: error.message }, { status: 500 });
  }
}