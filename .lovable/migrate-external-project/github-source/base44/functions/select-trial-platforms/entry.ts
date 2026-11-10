import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { PLATFORM_GENDER_MAP } from '../../shared/betaTemplate.ts';

// Creates Platform entities (club-scoped) from the user's selected
// platform/league names. Called during the guided tour Step 3.

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { platforms } = body;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = user.data?.club_id || user.club_id;
    if (!clubId) return Response.json({ error: 'No club found for this user' }, { status: 400 });

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return Response.json({ error: 'Select at least one platform' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Remove existing club-scoped platforms (re-create from tour selections)
    const existing = await svc.entities.Platform.filter({ club_id: clubId });
    if (existing.length > 0) {
      await svc.entities.Platform.deleteMany({ club_id: clubId });
    }

    // Create platform records with gender from the curated map
    const created = await svc.entities.Platform.bulkCreate(
      platforms.map((name) => ({
        club_id: clubId,
        name: name.trim(),
        gender: PLATFORM_GENDER_MAP[name] || 'Boys and Girls',
        is_active: true,
      }))
    );

    return Response.json({ platforms: created, count: created.length });
  } catch (error) {
    console.error('select-trial-platforms error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}