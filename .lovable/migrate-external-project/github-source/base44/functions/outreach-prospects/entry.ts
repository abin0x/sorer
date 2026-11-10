import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireSystemOwner, logAudit, addToSuppression } from '../../shared/outreachAccess.ts';
import { ensureDefaultSegments, applySegmentation } from '../../shared/outreachSegmentation.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, ...params } = body;

    const { user, error } = await requireSystemOwner(base44);
    if (error) return error;

    switch (action) {
      case 'list': {
        const query = {};
        if (params.status) query.status = params.status;
        if (params.source) query.source = params.source;
        if (params.registration_platform) query.registration_platform = params.registration_platform;
        if (params.region) query.region = params.region;
        if (params.owner_id) query.owner_id = params.owner_id;
        if (params.suppressed !== undefined) query.suppressed = params.suppressed;
        if (params.search) {
          query.$or = [
            { first_name: { $regex: params.search, $options: 'i' } },
            { last_name: { $regex: params.search, $options: 'i' } },
            { club_name: { $regex: params.search, $options: 'i' } },
            { email: { $regex: params.search, $options: 'i' } },
          ];
        }
        const opts = { sort: '-created_date', limit: params.limit || 50 };
        if (params.cursor) opts.cursor = params.cursor;
        const result = await base44.asServiceRole.entities.Prospect.filter(query, opts);
        const total = await base44.asServiceRole.entities.Prospect.count(query);
        return Response.json({ ...result, total });
      }

      case 'get': {
        const prospect = await base44.asServiceRole.entities.Prospect.get(params.id);
        if (!prospect) return Response.json({ error: 'Not found' }, { status: 404 });
        // Load sends for timeline
        const { items: sends } = await base44.asServiceRole.entities.OutreachSend.filter(
          { prospect_id: params.id }, { sort: '-created_date', limit: 50 }
        );
        // Load enrollments
        const { items: enrollments } = await base44.asServiceRole.entities.OutreachEnrollment.filter(
          { prospect_id: params.id }, { sort: '-created_date', limit: 20 }
        );
        return Response.json({ prospect, sends, enrollments });
      }

      case 'create': {
        const data = {
          first_name: params.first_name,
          last_name: params.last_name,
          title: params.title || '',
          club_name: params.club_name,
          club_website: params.club_website || '',
          branch_count: params.branch_count || null,
          player_count: params.player_count || null,
          email: params.email,
          email_verified: false,
          linkedin_url: params.linkedin_url || '',
          region: params.region || '',
          registration_platform: params.registration_platform || 'unknown',
          pain_signal: params.pain_signal || '',
          pain_signal_source: params.pain_signal_source || '',
          source: params.source || 'manual',
          status: 'new',
          owner_id: params.owner_id || user.id,
          owner_name: params.owner_name || user.full_name || user.email,
          notes: params.notes || '',
          notes_history: [],
          suppressed: false,
        };
        const prospect = await base44.asServiceRole.entities.Prospect.create(data);
        await applySegmentation(base44, [prospect], await ensureDefaultSegments(base44));
        await logAudit(base44, user, 'prospect.create', 'Prospect', prospect.id, { prospect });
        return Response.json({ prospect });
      }

      case 'update': {
        const existing = await base44.asServiceRole.entities.Prospect.get(params.id);
        if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
        const updates = {};
        const fields = ['first_name', 'last_name', 'title', 'club_name', 'club_website',
          'branch_count', 'player_count', 'email', 'linkedin_url', 'region',
          'registration_platform', 'pain_signal', 'pain_signal_source', 'source',
          'status', 'owner_id', 'owner_name', 'notes', 'needs_review', 'email_verified'];
        const diff = {};
        for (const f of fields) {
          if (params[f] !== undefined && params[f] !== existing[f]) {
            diff[f] = { before: existing[f], after: params[f] };
            updates[f] = params[f];
          }
        }
        const updated = await base44.asServiceRole.entities.Prospect.update(params.id, updates);
        await applySegmentation(base44, [{ ...existing, ...updates, id: params.id }], await ensureDefaultSegments(base44));
        await logAudit(base44, user, 'prospect.update', 'Prospect', params.id, { diff });
        return Response.json({ prospect: updated });
      }

      case 'delete': {
        await base44.asServiceRole.entities.Prospect.delete(params.id);
        // Clean up segment memberships and enrollments
        await base44.asServiceRole.entities.ProspectSegmentMember.deleteMany({ prospect_id: params.id });
        await base44.asServiceRole.entities.OutreachEnrollment.deleteMany({ prospect_id: params.id });
        await logAudit(base44, user, 'prospect.delete', 'Prospect', params.id);
        return Response.json({ success: true });
      }

      case 'suppress': {
        const existing = await base44.asServiceRole.entities.Prospect.get(params.id);
        if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
        await base44.asServiceRole.entities.Prospect.update(params.id, {
          suppressed: true,
          suppression_reason: params.reason || 'manual',
          status: existing.status === 'unsubscribed' ? 'unsubscribed' : existing.status,
        });
        await addToSuppression(base44, existing.email, params.reason || 'manual');
        // Remove from all active enrollments
        await base44.asServiceRole.entities.OutreachEnrollment.updateMany(
          { prospect_id: params.id, status: 'active' },
          { $set: { status: 'removed' } }
        );
        await logAudit(base44, user, 'prospect.suppress', 'Prospect', params.id, { reason: params.reason });
        return Response.json({ success: true });
      }

      case 'unsuppress': {
        const existing = await base44.asServiceRole.entities.Prospect.get(params.id);
        if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
        await base44.asServiceRole.entities.Prospect.update(params.id, { suppressed: false, suppression_reason: '' });
        await logAudit(base44, user, 'prospect.unsuppress', 'Prospect', params.id);
        return Response.json({ success: true });
      }

      case 'add_note': {
        const existing = await base44.asServiceRole.entities.Prospect.get(params.id);
        if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
        const note = {
          text: params.text,
          author_email: user.email,
          author_name: user.full_name || user.email,
          created_at: new Date().toISOString(),
        };
        const notesHistory = [...(existing.notes_history || []), note];
        await base44.asServiceRole.entities.Prospect.update(params.id, {
          notes: params.text,
          notes_history: notesHistory,
        });
        await logAudit(base44, user, 'prospect.add_note', 'Prospect', params.id, { note });
        return Response.json({ success: true, note });
      }

      case 'mark_replied': {
        const existing = await base44.asServiceRole.entities.Prospect.get(params.id);
        if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
        await base44.asServiceRole.entities.Prospect.update(params.id, {
          status: 'replied',
          last_engaged_at: new Date().toISOString(),
        });
        // Pause all active enrollments
        await base44.asServiceRole.entities.OutreachEnrollment.updateMany(
          { prospect_id: params.id, status: 'active' },
          { $set: { status: 'paused' } }
        );
        await logAudit(base44, user, 'prospect.mark_replied', 'Prospect', params.id);
        return Response.json({ success: true });
      }

      case 'mark_booked': {
        const existing = await base44.asServiceRole.entities.Prospect.get(params.id);
        if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
        await base44.asServiceRole.entities.Prospect.update(params.id, {
          status: 'booked',
          last_engaged_at: new Date().toISOString(),
        });
        await logAudit(base44, user, 'prospect.mark_booked', 'Prospect', params.id);
        return Response.json({ success: true });
      }

      case 'mark_not_interested': {
        const existing = await base44.asServiceRole.entities.Prospect.get(params.id);
        if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
        await base44.asServiceRole.entities.Prospect.update(params.id, { status: 'not_interested' });
        await base44.asServiceRole.entities.OutreachEnrollment.updateMany(
          { prospect_id: params.id, status: 'active' },
          { $set: { status: 'removed' } }
        );
        await logAudit(base44, user, 'prospect.mark_not_interested', 'Prospect', params.id);
        return Response.json({ success: true });
      }

      case 'import': {
        const records = params.records || [];
        const results = { created: 0, updated: 0, failed: 0, errors: [] };
        for (const r of records) {
          try {
            if (!r.email || !r.first_name || !r.last_name || !r.club_name) {
              results.failed++;
              results.errors.push(`Missing required field for: ${r.email || 'unknown'}`);
              continue;
            }
            // Check if prospect with this email already exists
            const existing = await base44.asServiceRole.entities.Prospect.filter({ email: r.email });
            if (existing?.[0]) {
              await base44.asServiceRole.entities.Prospect.update(existing[0].id, {
                first_name: r.first_name,
                last_name: r.last_name,
                title: r.title || existing[0].title,
                club_name: r.club_name,
                club_website: r.club_website || existing[0].club_website,
                branch_count: r.branch_count != null ? Number(r.branch_count) : existing[0].branch_count,
                player_count: r.player_count != null ? Number(r.player_count) : existing[0].player_count,
                region: r.region || existing[0].region,
                registration_platform: r.registration_platform || existing[0].registration_platform,
                pain_signal: r.pain_signal || existing[0].pain_signal,
                source: 'import',
              });
              results.updated++;
            } else {
              await base44.asServiceRole.entities.Prospect.create({
                first_name: r.first_name,
                last_name: r.last_name,
                title: r.title || '',
                club_name: r.club_name,
                club_website: r.club_website || '',
                branch_count: r.branch_count != null ? Number(r.branch_count) : null,
                player_count: r.player_count != null ? Number(r.player_count) : null,
                email: r.email,
                region: r.region || '',
                registration_platform: r.registration_platform || 'unknown',
                pain_signal: r.pain_signal || '',
                source: 'import',
                status: 'new',
                owner_id: user.id,
                owner_name: user.full_name || user.email,
                suppressed: false,
              });
              results.created++;
            }
          } catch (e) {
            results.failed++;
            results.errors.push(`${r.email || 'unknown'}: ${e.message}`);
          }
        }
        await logAudit(base44, user, 'prospect.import', 'Prospect', null, { count: records.length, results });
        return Response.json(results);
      }

      case 'export': {
        const query = {};
        if (params.status) query.status = params.status;
        if (params.segment_id) {
          const { items: members } = await base44.asServiceRole.entities.ProspectSegmentMember.filter(
            { segment_id: params.segment_id }, { limit: 5000 }
          );
          query.id = { $in: members.map(m => m.prospect_id) };
        }
        const { items } = await base44.asServiceRole.entities.Prospect.filter(query, { limit: 5000, sort: '-created_date' });
        return Response.json({ items });
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    console.error('outreach-prospects error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}