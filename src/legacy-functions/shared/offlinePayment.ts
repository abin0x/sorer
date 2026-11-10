// @ts-nocheck
// Shared helper: records an offline (cash, check, ACH, other) payment against a
// Registration, TryoutFinalRegistration, or EventRegistration. Writes a Payment
// ledger entry AND updates the source's running balance, so the ledger, family
// account, overdue queue, and QuickBooks sync all stay in agreement.
//
// Used by the record-offline-payment and overdue-payments functions.

export const OFFLINE_SOURCE_TYPES = ['registration', 'tryout_event', 'club_event'];

function fail(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function recordOfflinePayment(svc, params) {
  const { source_type, source_id, amount, payment_method, payment_date, notes, recorded_by } = params || {};
  if (!source_type || !source_id || !(amount > 0)) {
    throw fail('source_type, source_id, and a positive amount are required', 400);
  }
  if (!OFFLINE_SOURCE_TYPES.includes(source_type)) {
    throw fail('Unsupported source_type', 400);
  }

  const today = (payment_date || new Date().toISOString().split('T')[0]).slice(0, 10);

  let clubId, sourceLabel, playerId, playerName, guardianName, newPaid, newStatus, amountDue, sourceRef;
  if (source_type === 'registration') {
    const reg = await svc.entities.Registration.get(source_id).catch(() => null);
    if (!reg) throw fail('Registration not found', 404);
    clubId = reg.club_id;
    sourceLabel = reg.program_title || 'Registration';
    playerId = reg.player_id; playerName = reg.player_name; guardianName = reg.guardian_name;
    amountDue = Number(reg.amount_due || 0);
    newPaid = Number(reg.amount_paid || 0) + Number(amount);
    newStatus = newPaid >= amountDue ? 'paid' : 'partial';
    await svc.entities.Registration.update(source_id, { amount_paid: newPaid, payment_status: newStatus });
    sourceRef = { team_id: reg.team_id, team_name: reg.team_name, branch_id: reg.location_id, branch_name: reg.location_name };
  } else if (source_type === 'tryout_event') {
    const inv = await svc.entities.TryoutFinalRegistration.get(source_id).catch(() => null);
    if (!inv) throw fail('Registration invite not found', 404);
    clubId = inv.club_id;
    sourceLabel = `${inv.team_name || ''} Final Registration`.trim();
    playerId = inv.player_id; playerName = inv.player_name; guardianName = inv.guardian_email;
    amountDue = Number(inv.amount_due || 0);
    newPaid = Number(inv.amount_paid || 0) + Number(amount);
    newStatus = newPaid >= amountDue ? 'paid' : 'partial';
    await svc.entities.TryoutFinalRegistration.update(source_id, {
      amount_paid: newPaid,
      payment_status: newStatus,
      status: newPaid >= amountDue ? 'paid' : inv.status,
    });
    sourceRef = {};
  } else {
    const evReg = await svc.entities.EventRegistration.get(source_id).catch(() => null);
    if (!evReg) throw fail('Event registration not found', 404);
    clubId = evReg.club_id;
    sourceLabel = evReg.event_name || 'Event';
    playerName = evReg.player_name; guardianName = evReg.guardian_name;
    amountDue = Number(evReg.amount_due || 0);
    newPaid = Number(evReg.amount_paid || 0) + Number(amount);
    newStatus = newPaid >= amountDue ? 'paid' : 'partial';
    await svc.entities.EventRegistration.update(source_id, { amount_paid: newPaid, payment_status: newStatus });
    sourceRef = {};
  }

  const payment = await svc.entities.Payment.create({
    club_id: clubId,
    source_type,
    source_id,
    source_label: sourceLabel,
    player_id: playerId,
    player_name: playerName,
    guardian_name: guardianName,
    amount: Number(amount),
    currency: 'USD',
    processor_name: 'Offline',
    payment_method: payment_method || 'cash',
    status: 'paid_in_full',
    payment_date: today,
    recorded_by: recorded_by,
    notes: notes || '',
    ...sourceRef,
  });

  return {
    payment,
    club_id: clubId,
    source_label: sourceLabel,
    player_name: playerName,
    guardian_name: guardianName,
    amount_due: amountDue,
    new_paid: newPaid,
    payment_status: newStatus,
  };
}