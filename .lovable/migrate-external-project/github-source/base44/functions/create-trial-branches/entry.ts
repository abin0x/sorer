import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Creates Location (branch) entities for a trial club from the user's
// customized branch names. Called during the guided tour Step 2.

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { branchNames } = body;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = user.data?.club_id || user.club_id;
    if (!clubId) return Response.json({ error: 'No club found for this user' }, { status: 400 });

    if (!Array.isArray(branchNames) || branchNames.length === 0) {
      return Response.json({ error: 'At least one branch name is required' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Remove existing branches for this club (re-create from tour selections)
    const existing = await svc.entities.Location.filter({ club_id: clubId });
    if (existing.length > 0) {
      await svc.entities.Location.deleteMany({ club_id: clubId });
    }

    // Create branches from the user's names
    const branches = await svc.entities.Location.bulkCreate(
      branchNames.map((name, i) => ({
        club_id: clubId,
        name: name.trim(),
        branch_type: i === 0 ? 'nexus' : 'branch',
        is_active: true,
      }))
    );

    return Response.json({ branches, count: branches.length });
  } catch (error) {
    console.error('create-trial-branches error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}