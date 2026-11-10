// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Public endpoint: creates a pending ClubSignupRequest lead from the public
// "Start Your Club" form. No auth required — this only creates a lead, never
// a live tenant. The system owner reviews and provisions it manually.

export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const { club_name, contact_name, contact_email, contact_role, current_system, branch_count, player_count, phone } = body;

    if (!club_name?.trim() || !contact_name?.trim() || !contact_email?.trim()) {
      return Response.json({ error: 'Club name, your name, and email are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const record = await base44.asServiceRole.entities.ClubSignupRequest.create({
      club_name: club_name.trim(),
      contact_name: contact_name.trim(),
      contact_email: contact_email.trim().toLowerCase(),
      contact_role: contact_role || 'director',
      current_system: current_system || 'none',
      branch_count: branch_count || '1',
      player_count: player_count || '<50',
      phone: (phone || '').trim(),
      status: 'pending',
    });

    return Response.json({ ok: true, id: record.id });
  } catch (error) {
    console.error('submit-club-signup-request error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}