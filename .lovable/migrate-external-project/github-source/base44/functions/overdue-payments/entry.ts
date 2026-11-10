import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import { recordOfflinePayment } from '../../shared/offlinePayment.ts';

// Overdue-payment resolution queue.
//
// `sync` groups the club's late / failed charges (Payment rows with status
// past_due or payment_failed) into one collection case per payer account, so a
// bookkeeper sees "this family owes $700 across 2 missed payments" instead of a
// flat ledger. The other actions record what the club actually did about it:
// send a reminder, take a payment, arrange a plan, log a contact, close it out.
// Every write runs with the service role; the caller must be club finance staff.

const FINANCE_ROLES = [
  'master_admin', 'admin', 'club_director', 'club_admin',
  'branch_director', 'branch_admin', 'bookkeeper',
];
const SYSTEM_ROLES = ['system_owner', 'system_admin', 'system_support'];
const OPEN_STATUSES = ['open', 'in_progress'];
const CONTACT_CHANNELS = ['call', 'email', 'text', 'in_person', 'letter', 'other'];
const RESOLUTION_TYPES = ['payment_received', 'payment_plan', 'financial_aid', 'written_off', 'corrected', 'other'];
// Closing the case also settles the ledger charges for these outcomes.
const SETTLE_AS = { payment_received: 'paid_in_full', written_off: 'waived', corrected: 'cancelled' };
const CHANNEL_LABELS = { call: 'Phone call', email: 'Email', text: 'Text', in_person: 'In person', letter: 'Letter', other: 'Contact' };

const rows = (res) => (Array.isArray(res) ? res : res?.items || []);
const money = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const addDaysIso = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const daysBetween = (from, to) =>
  Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
const bucketFor = (days) => (days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+');
const priorityFor = (days) => (days >= 90 ? 'critical' : days >= 60 ? 'high' : 'normal');
const accountKeyFor = (p) => `${p.source_type || 'other'}:${p.source_id || p.id}`;

function fail(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function createInChunks(entity, records) {
  const created = [];
  for (let i = 0; i < records.length; i += 100) {
    const batch = await entity.bulkCreate(records.slice(i, i + 100));
    created.push(...(Array.isArray(batch) ? batch : []));
  }
  return created;
}

async function updateInChunks(entity, records) {
  for (let i = 0; i < records.length; i += 100) {
    await entity.bulkUpdate(records.slice(i, i + 100));
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'sync';

    const ownClubId = user.data?.club_id || user.club_id;
    const isAdmin = user.role === 'admin' || user.is_super_admin === true;
    const isSystem = SYSTEM_ROLES.includes(user.system_role);
    const isFinance = FINANCE_ROLES.includes(user.custom_role);
    if (!isAdmin && !isSystem && !isFinance) {
      return Response.json({ error: 'Forbidden — club finance access required' }, { status: 403 });
    }

    const clubId = body.club_id || ownClubId;
    if (!clubId) return Response.json({ error: 'No club found for this user' }, { status: 400 });
    if (!isAdmin && !isSystem && clubId !== ownClubId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const actor = { email: user.email, name: user.full_name || user.email };
    const withEntry = (record, entry) => [...(record.timeline || []), entry];

    const loadCase = async () => {
      if (!body.case_id) throw fail('A case is required', 400);
      const record = await svc.entities.PaymentResolution.get(body.case_id).catch(() => null);
      if (!record || record.club_id !== clubId) throw fail('Case not found', 404);
      return record;
    };

    // Ledger rows normally point straight at the Registration, but some tools
    // and older imports stamp the player id as the source — accept either.
    const resolveRegistration = async (record) => {
      const direct = record.source_id
        ? await svc.entities.Registration.get(record.source_id).catch(() => null)
        : null;
      if (direct) return direct;
      const candidates = [record.source_id, record.player_id].filter(Boolean);
      for (const playerId of candidates) {
        const found = rows(await svc.entities.Registration.filter({ club_id: clubId, player_id: playerId }, '-created_date', 5));
        if (found.length) return found[0];
      }
      return null;
    };

    // ---------- sync: rebuild the queue from the payment ledger ----------
    const sync = async () => {
      const today = todayIso();
      const stamp = new Date().toISOString();

      const [lateRes, caseRes] = await Promise.all([
        svc.entities.Payment.filter({ club_id: clubId, status: { $in: ['past_due', 'payment_failed'] } }, '-payment_date', 500),
        svc.entities.PaymentResolution.filter({ club_id: clubId }, '-created_date', 500),
      ]);
      const lateCharges = rows(lateRes).filter((p) => !p.is_refund);
      const existing = rows(caseRes);

      const byAccount = new Map();
      lateCharges.forEach((p) => {
        const key = accountKeyFor(p);
        if (!byAccount.has(key)) byAccount.set(key, []);
        byAccount.get(key).push(p);
      });

      const caseByKey = new Map(existing.map((c) => [c.account_key, c]));
      const toCreate = [];
      const toUpdate = [];

      byAccount.forEach((charges, key) => {
        const first = charges[0];
        const balance = charges.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const dates = charges.map((p) => (p.payment_date || '').slice(0, 10)).filter(Boolean).sort();
        const dueDate = dates[0] || (first.created_date || '').slice(0, 10) || today;
        const days = Math.max(0, daysBetween(dueDate, today));

        const fields = {
          club_id: clubId,
          account_key: key,
          source_type: first.source_type || 'other',
          source_id: first.source_id || '',
          source_label: first.source_label || 'Payment',
          player_id: first.player_id || '',
          player_name: first.player_name || '',
          guardian_name: first.guardian_name || '',
          family_email: charges.find((p) => p.family_email)?.family_email || '',
          team_name: first.team_name || '',
          branch_name: first.branch_name || '',
          amount_outstanding: balance,
          late_payment_count: charges.length,
          late_payment_ids: charges.map((p) => p.id),
          due_date: dueDate,
          last_late_payment_date: dates[dates.length - 1] || '',
          days_overdue: days,
          aging_bucket: bucketFor(days),
          priority: priorityFor(days),
          last_synced_at: stamp,
        };

        const record = caseByKey.get(key);
        if (!record) {
          toCreate.push({
            ...fields,
            status: 'open',
            timeline: [{
              at: stamp, by: 'system', action: 'detected',
              note: `${money(balance)} missed across ${charges.length} payment${charges.length === 1 ? '' : 's'} — oldest due ${dueDate} (${days} day${days === 1 ? '' : 's'} ago).`,
            }],
          });
          return;
        }
        if (OPEN_STATUSES.includes(record.status)) {
          toUpdate.push({ id: record.id, ...fields });
          return;
        }
        // A closed case comes back to life only when a brand-new charge is missed.
        const known = new Set(record.late_payment_ids || []);
        const hasNew = charges.some((p) => !known.has(p.id));
        toUpdate.push(hasNew ? {
          ...fields,
          id: record.id,
          status: 'in_progress',
          resolved_at: '',
          timeline: withEntry(record, {
            at: stamp, by: 'system', action: 'reopened',
            note: `A new payment was missed — ${money(balance)} now outstanding.`,
          }),
        } : { id: record.id, ...fields });
      });

      // Cases whose charges are all settled (or were adjusted) elsewhere close themselves.
      const liveKeys = new Set(byAccount.keys());
      const toClose = existing
        .filter((c) => OPEN_STATUSES.includes(c.status) && !liveKeys.has(c.account_key))
        .map((c) => ({
          id: c.id,
          status: 'resolved',
          resolution_type: 'corrected',
          resolution_note: 'No longer past due — settled or adjusted in the payment ledger.',
          resolved_at: stamp,
          resolved_by: 'auto',
          amount_outstanding: 0,
          late_payment_count: 0,
          late_payment_ids: [],
          timeline: withEntry(c, {
            at: stamp, by: 'system', action: 'closed',
            note: 'Every missed payment on this account is settled — case closed automatically.',
          }),
        }));

      if (toCreate.length) await createInChunks(svc.entities.PaymentResolution, toCreate);
      if (toUpdate.length) await updateInChunks(svc.entities.PaymentResolution, toUpdate);
      if (toClose.length) await updateInChunks(svc.entities.PaymentResolution, toClose);

      const open = rows(await svc.entities.PaymentResolution.filter(
        { club_id: clubId, status: { $in: OPEN_STATUSES } }, '-days_overdue', 200,
      )).sort((a, b) => (b.days_overdue || 0) - (a.days_overdue || 0));

      const buckets = { '0-30': { count: 0, amount: 0 }, '31-60': { count: 0, amount: 0 }, '61-90': { count: 0, amount: 0 }, '90+': { count: 0, amount: 0 } };
      open.forEach((c) => {
        const b = buckets[c.aging_bucket] || buckets['0-30'];
        b.count += 1;
        b.amount += Number(c.amount_outstanding || 0);
      });

      const summary = {
        openCases: open.length,
        totalOutstanding: open.reduce((s, c) => s + Number(c.amount_outstanding || 0), 0),
        buckets,
        followUpsDue: open.filter((c) => c.next_follow_up && c.next_follow_up <= today).length,
        unassigned: open.filter((c) => !c.assigned_to).length,
        critical: open.filter((c) => c.priority === 'critical').length,
        inProgress: open.filter((c) => c.status === 'in_progress').length,
        missedPayments: lateCharges.length,
        newCases: toCreate.length,
        autoClosed: toClose.length,
        lastSyncedAt: stamp,
      };

      return Response.json({ success: true, club_id: clubId, summary, cases: open });
    };

    // ---------- send a payment reminder to the family ----------
    const sendReminder = async () => {
      const record = await loadCase();
      const email = record.family_email;
      if (!email) throw fail('This family has no email on file — add one on the guardian record first.', 400);

      const appUrl = (req.headers.get('X-Base44-App-Url') || Deno.env.get('WIX_CHECKOUT_APP_URL') || '').replace(/\/$/, '');
      if (!appUrl) throw fail('App URL not configured', 500);

      const club = await svc.entities.Club.get(clubId).catch(() => null);
      const payUrl = `${appUrl}/FamilyAccount`;
      const balance = money(record.amount_outstanding);
      const missed = Number(record.late_payment_count || 0);
      const days = Number(record.days_overdue || 0);

      const html = `
        <p>Hi ${record.guardian_name || 'there'},</p>
        <p>Our records show an outstanding balance on your account for <strong>${record.player_name || 'your player'}</strong>${record.team_name ? ` (${record.team_name})` : ''}.</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;">
          <tr><td style="padding:6px 0;color:#64748b;">Charges missed</td><td style="padding:6px 0;text-align:right;font-weight:700;">${missed}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Oldest due date</td><td style="padding:6px 0;text-align:right;font-weight:700;">${record.due_date || '—'} (${days} day${days === 1 ? '' : 's'} ago)</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Amount outstanding</td><td style="padding:6px 0;text-align:right;font-weight:700;font-size:18px;">${balance}</td></tr>
        </table>
        <div style="text-align:center;margin:26px 0;">
          <a href="${payUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:15px 34px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">View balance &amp; pay</a>
        </div>
        <p style="color:#64748b;font-size:13px;">Or copy this link into your browser:<br/>${payUrl}</p>
        <p style="color:#64748b;font-size:13px;margin-top:18px;">Already paid? Please disregard this note. If a payment plan would help, reply to this email and ${club?.name || 'the club'} will work with you.</p>
      `;

      await sendBrandedEmail(base44, {
        to: email,
        subject: `${club?.name || 'Club'} — outstanding balance of ${balance}${record.player_name ? ` for ${record.player_name}` : ''}`,
        html,
        from_name: club?.name,
      });

      const stamp = new Date().toISOString();
      const updated = await svc.entities.PaymentResolution.update(record.id, {
        status: record.status === 'open' ? 'in_progress' : record.status,
        reminder_count: Number(record.reminder_count || 0) + 1,
        last_reminder_at: stamp,
        last_contacted_at: stamp,
        last_contact_channel: 'email',
        contact_attempts: Number(record.contact_attempts || 0) + 1,
        timeline: withEntry(record, { at: stamp, by: actor.name, action: 'reminder_sent', note: `Reminder emailed to ${email}.` }),
      });

      return Response.json({ success: true, case: updated });
    };

    // ---------- take a payment and apply it to the oldest missed charges ----------
    const recordPayment = async () => {
      const record = await loadCase();
      const amount = Number(body.amount || 0);
      if (!(amount > 0)) throw fail('Enter the amount received', 400);
      const method = body.payment_method || 'cash';
      const paymentDate = (body.payment_date || todayIso()).slice(0, 10);
      const note = (body.notes || '').trim();

      let ledger;
      let balanceNote = '';
      if (record.source_type === 'registration') {
        const registration = await resolveRegistration(record);
        if (!registration) throw fail('No registration found for this account — record the payment from the ledger instead.', 400);
        const result = await recordOfflinePayment(svc, {
          source_type: 'registration',
          source_id: registration.id,
          amount,
          payment_method: method,
          payment_date: paymentDate,
          notes: note || `Recorded from the overdue queue for ${record.player_name || 'account'}.`,
          recorded_by: actor.email,
        });
        ledger = result.payment;
        balanceNote = `Account balance now ${money(Math.max(0, Number(result.amount_due || 0) - Number(result.new_paid || 0)))}.`;
      } else {
        // Event and tryout charges carry no running balance — the charge row is the record.
        ledger = await svc.entities.Payment.create({
          club_id: clubId,
          source_type: record.source_type,
          source_id: record.source_id,
          source_label: record.source_label || 'Payment',
          player_id: record.player_id || '',
          player_name: record.player_name || '',
          guardian_name: record.guardian_name || '',
          family_email: record.family_email || '',
          amount,
          currency: 'USD',
          processor_name: 'Offline',
          payment_method: method,
          status: 'paid_in_full',
          payment_date: paymentDate,
          recorded_by: actor.email,
          notes: note || 'Recorded from the overdue queue.',
        });
      }

      const chargeIds = record.late_payment_ids || [];
      const charges = rows(await svc.entities.Payment.filter({ id: { $in: chargeIds } }, 'payment_date', 200))
        .slice()
        .sort((a, b) => String(a.payment_date || '').localeCompare(String(b.payment_date || '')));

      let left = amount;
      const settledIds = new Set();
      charges.forEach((charge) => {
        const chargeAmount = Number(charge.amount || 0);
        if (left + 0.001 >= chargeAmount) {
          left -= chargeAmount;
          settledIds.add(charge.id);
        }
      });
      if (settledIds.size) {
        await updateInChunks(svc.entities.Payment, charges.filter((c) => settledIds.has(c.id)).map((c) => ({
          id: c.id,
          status: 'paid_in_full',
          notes: `${c.notes ? `${c.notes} · ` : ''}Settled with a ${method} payment recorded ${paymentDate} from the overdue queue.`,
        })));
      }

      const remaining = charges.filter((c) => !settledIds.has(c.id));
      const outstanding = remaining.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const remainingDates = remaining.map((c) => (c.payment_date || '').slice(0, 10)).filter(Boolean).sort();
      const dueDate = remainingDates[0] || record.due_date || paymentDate;
      const days = Math.max(0, daysBetween(dueDate, todayIso()));
      const stamp = new Date().toISOString();

      const entry = {
        at: stamp, by: actor.name, action: 'payment_recorded',
        note: `${money(amount)} recorded by ${method}.${settledIds.size ? ` ${settledIds.size} missed payment${settledIds.size === 1 ? '' : 's'} settled.` : ''} ${outstanding > 0 ? `${money(outstanding)} still outstanding.` : 'Account clear.'} ${balanceNote}`.trim(),
      };

      const updated = await svc.entities.PaymentResolution.update(record.id, outstanding <= 0 ? {
        status: 'resolved',
        resolution_type: 'payment_received',
        resolution_note: `Paid in full — ${money(amount)} recorded ${paymentDate}.`,
        resolved_at: stamp,
        resolved_by: actor.email,
        amount_outstanding: 0,
        late_payment_count: 0,
        late_payment_ids: [],
        timeline: withEntry(record, entry),
      } : {
        status: 'in_progress',
        amount_outstanding: outstanding,
        late_payment_count: remaining.length,
        late_payment_ids: remaining.map((c) => c.id),
        due_date: dueDate,
        days_overdue: days,
        aging_bucket: bucketFor(days),
        timeline: withEntry(record, entry),
      });

      return Response.json({ success: true, case: updated, ledger_payment_id: ledger.id, settled: settledIds.size, remaining: outstanding });
    };

    // ---------- arrange a payment plan on the registration ----------
    const setPlan = async () => {
      const record = await loadCase();
      if (record.source_type !== 'registration') {
        throw fail('Payment plans apply to registration balances — this charge sits on an event registration.', 400);
      }
      const installments = Number(body.installments || 0);
      if (!(installments >= 2 && installments <= 12)) throw fail('Choose between 2 and 12 installments', 400);

      const firstDue = (body.first_due_date || addDaysIso(30)).slice(0, 10);
      const per = Math.round((Number(record.amount_outstanding || 0) / installments) * 100) / 100;
      const planNote = (body.note || '').trim();

      const registration = await resolveRegistration(record);
      if (!registration) throw fail('No registration found for this account', 400);

      await svc.entities.Registration.update(registration.id, {
        payment_frequency: 'monthly',
        installment_count: installments,
        installment_amount: per,
        next_installment_date: firstDue,
        payment_plan_notes: planNote || `Plan arranged ${todayIso()} for ${money(record.amount_outstanding)} in ${installments} installments of ${money(per)}.`,
      });

      const stamp = new Date().toISOString();
      const updated = await svc.entities.PaymentResolution.update(record.id, {
        status: 'in_progress',
        plan_installments: installments,
        plan_amount: per,
        plan_first_due: firstDue,
        next_follow_up: firstDue,
        timeline: withEntry(record, {
          at: stamp, by: actor.name, action: 'plan_arranged',
          note: `${installments} installments of ${money(per)}, first due ${firstDue}.${planNote ? ` ${planNote}` : ''}`,
        }),
      });

      return Response.json({ success: true, case: updated, installment_amount: per });
    };

    // ---------- log a contact attempt, follow-up date, or owner ----------
    const logContact = async () => {
      const record = await loadCase();
      const channel = CONTACT_CHANNELS.includes(body.channel) ? body.channel : 'other';
      const note = (body.note || '').trim();
      if (!note && !body.assigned_to) throw fail('Add a short note about the contact, or assign the case', 400);

      const stamp = new Date().toISOString();
      const patch = {
        status: record.status === 'open' ? 'in_progress' : record.status,
        contact_attempts: Number(record.contact_attempts || 0) + (note ? 1 : 0),
        timeline: withEntry(record, {
          at: stamp, by: actor.name,
          action: note ? 'contact_logged' : 'assigned',
          note: note ? `${CHANNEL_LABELS[channel]}: ${note}` : `${body.assigned_name || body.assigned_to} took this case.`,
        }),
      };
      if (note) {
        patch.last_contacted_at = stamp;
        patch.last_contact_channel = channel;
      }
      if (body.next_follow_up) patch.next_follow_up = String(body.next_follow_up).slice(0, 10);
      if (body.assigned_to) {
        patch.assigned_to = body.assigned_to;
        patch.assigned_name = body.assigned_name || body.assigned_to;
      }

      const updated = await svc.entities.PaymentResolution.update(record.id, patch);
      return Response.json({ success: true, case: updated });
    };

    // ---------- close the case ----------
    const resolveCase = async () => {
      const record = await loadCase();
      const type = RESOLUTION_TYPES.includes(body.resolution_type) ? body.resolution_type : 'other';
      const note = (body.note || '').trim();
      const settleAs = SETTLE_AS[type];
      const chargeIds = record.late_payment_ids || [];

      if (settleAs && chargeIds.length) {
        const charges = rows(await svc.entities.Payment.filter({ id: { $in: chargeIds } }, 'payment_date', 200));
        const label = settleAs === 'waived' ? 'Written off' : settleAs === 'cancelled' ? 'Cancelled' : 'Marked collected';
        await updateInChunks(svc.entities.Payment, charges.map((c) => ({
          id: c.id,
          status: settleAs,
          notes: `${c.notes ? `${c.notes} · ` : ''}${label} from the overdue queue on ${todayIso()}${note ? ` — ${note}` : ''}.`,
        })));
      }

      const stamp = new Date().toISOString();
      const updated = await svc.entities.PaymentResolution.update(record.id, {
        status: type === 'written_off' ? 'written_off' : 'resolved',
        resolution_type: type,
        resolution_note: note,
        resolved_at: stamp,
        resolved_by: actor.email,
        amount_outstanding: settleAs ? 0 : record.amount_outstanding,
        late_payment_count: settleAs ? 0 : record.late_payment_count,
        late_payment_ids: settleAs ? [] : chargeIds,
        timeline: withEntry(record, {
          at: stamp, by: actor.name, action: 'resolved',
          note: `${money(record.amount_outstanding)} closed as ${type.replace(/_/g, ' ')}.${note ? ` ${note}` : ''}`,
        }),
      });

      return Response.json({ success: true, case: updated });
    };

    switch (action) {
      case 'sync': return await sync();
      case 'reminder': return await sendReminder();
      case 'record_payment': return await recordPayment();
      case 'plan': return await setPlan();
      case 'contact': return await logContact();
      case 'resolve': return await resolveCase();
      default: return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('overdue-payments error:', error);
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}