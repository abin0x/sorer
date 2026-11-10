import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { deriveBrandColors } from '../../shared/deriveBrandColors.ts';

/**
 * Derive brand color tokens (tints, shades, on-color, ring) from a tenant's
 * primary and secondary hex colors. Called by the System Console when a
 * system owner saves a club's branding — the returned tokens are stored on
 * the Club entity's derived_brand_colors field and injected as CSS custom
 * properties by TenantBrandingProvider at runtime.
 *
 * POST body: { primary_color: "#hex", secondary_color?: "#hex" }
 * Returns: { primary: DerivedBrandColors, secondary: DerivedBrandColors | null }
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const primary = body?.primary_color;
    const secondary = body?.secondary_color;

    if (!primary) return Response.json({ error: 'primary_color is required' }, { status: 400 });

    const primaryDerived = deriveBrandColors(primary);
    if (!primaryDerived) return Response.json({ error: 'Invalid primary_color hex' }, { status: 400 });

    const secondaryDerived = secondary ? deriveBrandColors(secondary) : null;

    return Response.json({
      primary: primaryDerived,
      secondary: secondaryDerived,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}