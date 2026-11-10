import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireSystemOwner, logAudit } from '../../shared/outreachAccess.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, ...params } = body;

    const { user, error } = await requireSystemOwner(base44);
    if (error) return error;

    switch (action) {
      case 'list': {
        const { items } = await base44.asServiceRole.entities.OutreachSequence.filter(
          {}, { sort: '-created_date', limit: 200 }
        );
        // Get enrollment counts
        const seqIds = items.map(s => s.id);
        let enrollCounts = {};
        if (seqIds.length) {
          const { rows } = await base44.asServiceRole.entities.OutreachEnrollment.aggregate({
            query: {},
            groupBy: 'sequence_id',
          });
          for (const r of (rows || [])) {
            enrollCounts[r.sequence_id] = r.count;
          }
        }
        return Response.json({ items: items.map(s => ({ ...s, enrolled_count: enrollCounts[s.id] || 0 })) });
      }

      case 'get': {
        const sequence = await base44.asServiceRole.entities.OutreachSequence.get(params.id);
        if (!sequence) return Response.json({ error: 'Not found' }, { status: 404 });
        const { items: steps } = await base44.asServiceRole.entities.OutreachSequenceStep.filter(
          { sequence_id: params.id }, { sort: 'step_order', limit: 50 }
        );
        const { items: enrollments } = await base44.asServiceRole.entities.OutreachEnrollment.filter(
          { sequence_id: params.id, status: 'active' }, { limit: 500 }
        );
        return Response.json({ sequence, steps, active_enrollments: enrollments.length });
      }

      case 'create': {
        const seq = await base44.asServiceRole.entities.OutreachSequence.create({
          name: params.name,
          segment_id: params.segment_id || '',
          segment_name: params.segment_name || '',
          status: 'draft',
          created_by: user.id,
          created_by_name: user.full_name || user.email,
        });
        await logAudit(base44, user, 'sequence.create', 'OutreachSequence', seq.id);
        return Response.json({ sequence: seq });
      }

      case 'update': {
        const updates = {};
        for (const f of ['name', 'segment_id', 'segment_name', 'status']) {
          if (params[f] !== undefined) updates[f] = params[f];
        }
        const updated = await base44.asServiceRole.entities.OutreachSequence.update(params.id, updates);
        await logAudit(base44, user, 'sequence.update', 'OutreachSequence', params.id, { updates });
        return Response.json({ sequence: updated });
      }

      case 'delete': {
        await base44.asServiceRole.entities.OutreachSequenceStep.deleteMany({ sequence_id: params.id });
        await base44.asServiceRole.entities.OutreachEnrollment.deleteMany({ sequence_id: params.id });
        await base44.asServiceRole.entities.OutreachSequence.delete(params.id);
        await logAudit(base44, user, 'sequence.delete', 'OutreachSequence', params.id);
        return Response.json({ success: true });
      }

      case 'add_step': {
        const step = await base44.asServiceRole.entities.OutreachSequenceStep.create({
          sequence_id: params.sequence_id,
          step_order: params.step_order || 1,
          delay_days: params.delay_days || 0,
          subject_template: params.subject_template || '',
          body_template: params.body_template || '',
          template_id: params.template_id || '',
          template_name: params.template_name || '',
          condition: params.condition || 'always',
          ab_variant: params.ab_variant || null,
          ab_parent_step_id: params.ab_parent_step_id || '',
        });
        await logAudit(base44, user, 'sequence.add_step', 'OutreachSequenceStep', step.id);
        return Response.json({ step });
      }

      case 'update_step': {
        const updates = {};
        for (const f of ['step_order', 'delay_days', 'subject_template', 'body_template',
          'template_id', 'template_name', 'condition', 'ab_variant']) {
          if (params[f] !== undefined) updates[f] = params[f];
        }
        const updated = await base44.asServiceRole.entities.OutreachSequenceStep.update(params.step_id, updates);
        await logAudit(base44, user, 'sequence.update_step', 'OutreachSequenceStep', params.step_id, { updates });
        return Response.json({ step: updated });
      }

      case 'delete_step': {
        await base44.asServiceRole.entities.OutreachSequenceStep.delete(params.step_id);
        await logAudit(base44, user, 'sequence.delete_step', 'OutreachSequenceStep', params.step_id);
        return Response.json({ success: true });
      }

      case 'reorder_steps': {
        const { step_ids } = params; // ordered array
        const updates = step_ids.map((id, i) => ({ id, step_order: i + 1 }));
        await base44.asServiceRole.entities.OutreachSequenceStep.bulkUpdate(updates);
        await logAudit(base44, user, 'sequence.reorder_steps', 'OutreachSequence', params.sequence_id);
        return Response.json({ success: true });
      }

      case 'enroll': {
        // Enroll a segment or individual prospect_ids
        let prospectIds = params.prospect_ids || [];
        if (params.segment_id) {
          const { items: members } = await base44.asServiceRole.entities.ProspectSegmentMember.filter(
            { segment_id: params.segment_id }, { limit: 5000 }
          );
          prospectIds = [...new Set([...prospectIds, ...members.map(m => m.prospect_id)])];
        }
        const sequence = await base44.asServiceRole.entities.OutreachSequence.get(params.sequence_id);
        let enrolled = 0, skipped = 0;
        for (const pid of prospectIds) {
          // Check if already enrolled
          const existing = await base44.asServiceRole.entities.OutreachEnrollment.filter(
            { prospect_id: pid, sequence_id: params.sequence_id, status: { $in: ['active', 'paused'] } }
          );
          if (existing?.[0]) { skipped++; continue; }
          const prospect = await base44.asServiceRole.entities.Prospect.get(pid);
          if (!prospect || prospect.suppressed || prospect.needs_review || prospect.status === 'unsubscribed' || prospect.status === 'bounced') {
            skipped++; continue;
          }
          await base44.asServiceRole.entities.OutreachEnrollment.create({
            prospect_id: pid,
            prospect_name: `${prospect.first_name} ${prospect.last_name}`,
            prospect_email: prospect.email,
            sequence_id: params.sequence_id,
            sequence_name: sequence?.name || '',
            current_step_order: 0,
            status: 'active',
            enrolled_at: new Date().toISOString(),
            next_send_at: new Date().toISOString(),
          });
          enrolled++;
        }
        await logAudit(base44, user, 'sequence.enroll', 'OutreachSequence', params.sequence_id, { enrolled, skipped });
        return Response.json({ enrolled, skipped });
      }

      case 'unenroll': {
        await base44.asServiceRole.entities.OutreachEnrollment.updateMany(
          { prospect_id: params.prospect_id, sequence_id: params.sequence_id, status: { $in: ['active', 'paused'] } },
          { $set: { status: 'removed' } }
        );
        await logAudit(base44, user, 'sequence.unenroll', 'OutreachSequence', params.sequence_id, { prospect_id: params.prospect_id });
        return Response.json({ success: true });
      }

      case 'pause_enrollment': {
        await base44.asServiceRole.entities.OutreachEnrollment.update(params.enrollment_id, { status: 'paused' });
        await logAudit(base44, user, 'enrollment.pause', 'OutreachEnrollment', params.enrollment_id);
        return Response.json({ success: true });
      }

      case 'resume_enrollment': {
        await base44.asServiceRole.entities.OutreachEnrollment.update(params.enrollment_id, {
          status: 'active',
          next_send_at: new Date().toISOString(),
        });
        await logAudit(base44, user, 'enrollment.resume', 'OutreachEnrollment', params.enrollment_id);
        return Response.json({ success: true });
      }

      case 'activate': {
        await base44.asServiceRole.entities.OutreachSequence.update(params.id, { status: 'active' });
        await logAudit(base44, user, 'sequence.activate', 'OutreachSequence', params.id);
        return Response.json({ success: true });
      }

      case 'pause': {
        await base44.asServiceRole.entities.OutreachSequence.update(params.id, { status: 'paused' });
        await logAudit(base44, user, 'sequence.pause', 'OutreachSequence', params.id);
        return Response.json({ success: true });
      }

      case 'archive': {
        await base44.asServiceRole.entities.OutreachSequence.update(params.id, { status: 'archived' });
        await logAudit(base44, user, 'sequence.archive', 'OutreachSequence', params.id);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    console.error('outreach-sequences error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}