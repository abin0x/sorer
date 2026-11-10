// Public write for the Final Registration portal — anonymous parents/guardians
// submit the waiver + payment choice with no app login, so this must bypass RLS
// via the service role. Only touches the one invite row identified by inviteId,
// and only the three fields the portal form actually collects.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { inviteId, waiver_accepted, payment_frequency, installment_count, installment_amount, installments_paid, next_installment_date, autopay_enabled } = body;
    if (!inviteId || !waiver_accepted) {
      return Response.json({ error: 'Missing inviteId or waiver acceptance' }, { status: 400 });
    }

    const invite = await svc.entities.TryoutFinalRegistration.get(inviteId).catch(() => null);
    if (!invite) {
      return Response.json({ error: 'Invite not found' }, { status: 404 });
    }

    const patch = {
      waiver_accepted: true,
      payment_frequency: payment_frequency === 'installments' ? 'installments' : 'one_time',
      status: 'submitted',
      submitted_date: new Date().toISOString(),
    };
    // Persist the installment plan fields when the family chose installments.
    if (payment_frequency === 'installments') {
      patch.installment_count = Number(installment_count) || 0;
      patch.installment_amount = Number(installment_amount) || 0;
      patch.installments_paid = Number(installments_paid) || 0;
      patch.next_installment_date = next_installment_date || new Date().toISOString().split('T')[0];
      patch.autopay_enabled = !!autopay_enabled;
    }
    const updated = await svc.entities.TryoutFinalRegistration.update(inviteId, patch);

    return Response.json({ success: true, invite: updated });
  } catch (error) {
    console.error('submitFinalRegistration error:', error);
    return Response.json({ error: error.message || 'Failed to submit' }, { status: 500 });
  }
}