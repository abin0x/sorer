// @ts-nocheck
// Shared Stripe → QuickBooks sync logic used by club-stripe-webhook.
//
// Pipeline (per the club's build guide):
//   1. Family payment succeeds -> Sales Receipt (income line, Class = team,
//      Location = branch, deposited to "Stripe Clearing").
//   2. Stripe fee -> Purchase/Expense against "Stripe Fees".
//   3. Refund -> Refund Receipt with the same Class/Location (fee not reversed).
//   4. Payout lands -> Deposit moving net funds from Stripe Clearing to the bank.
//
// A payment whose team or branch isn't mapped to a QuickBooks Class/Location
// is never synced — it's marked 'blocked' and the bookkeeper is notified.
// All functions take the full base44 client (service-role calls happen inside).

import { getClubQbConnection, findOrCreateCustomer, findOrCreateAccount, qbPost } from './quickbooksApi.ts';

const INCOME_ACCOUNT_BY_TYPE = {
  dues: 'Club Dues Income',
  event: 'Event Income',
  spiritwear: 'Spiritwear Income',
  other: 'Club Income',
};

async function alertBookkeeper(base44, club, payment, reason) {
  const svc = base44.asServiceRole;
  const bookkeepers = await svc.entities.User.filter({ club_id: club.id, custom_role: 'bookkeeper' }).catch(() => []);
  const admins = await svc.entities.User.filter({ club_id: club.id, custom_role: 'club_admin' }).catch(() => []);
  const recipients = [...(bookkeepers || []), ...(admins || [])];
  for (const r of recipients) {
    await svc.entities.Notification.create({
      club_id: club.id,
      user_email: r.email,
      type: 'budget_alert',
      delivery: 'push',
      title: 'Stripe payment blocked from QuickBooks sync',
      message: `${payment.source_label || 'A payment'} ($${Number(payment.amount || 0).toFixed(2)}) could not be synced: ${reason}`,
      link: '/PaymentSettings',
    }).catch(() => {});
  }
}

// Resolves this payment's Team -> Class and Branch -> Location mapping.
// Returns null (and alerts the bookkeeper) if either side isn't mapped.
async function resolveMapping(base44, club, payment) {
  const svc = base44.asServiceRole;
  if (!payment.team_id || !payment.branch_id) {
    await alertBookkeeper(base44, club, payment, 'missing team or branch tag on the Stripe payment');
    return null;
  }
  const team = await svc.entities.Team.get(payment.team_id).catch(() => null);
  const branch = await svc.entities.Location.get(payment.branch_id).catch(() => null);
  if (!team?.qbo_class_id) {
    await alertBookkeeper(base44, club, payment, `team "${payment.team_name || team?.name || payment.team_id}" has no QuickBooks Class mapped`);
    return null;
  }
  if (!branch?.qbo_location_id) {
    await alertBookkeeper(base44, club, payment, `branch "${payment.branch_name || branch?.name || payment.branch_id}" has no QuickBooks Location mapped`);
    return null;
  }
  return { classId: team.qbo_class_id, locationId: branch.qbo_location_id };
}

export async function postPaymentToQbo(base44, club, payment) {
  const svc = base44.asServiceRole;
  try {
    if (!club.quickbooks_connected) return;
    const mapping = await resolveMapping(base44, club, payment);
    if (!mapping) {
      await svc.entities.Payment.update(payment.id, { qbo_entry_type: 'blocked' }).catch(() => {});
      return;
    }

    const qb = await getClubQbConnection(base44, club.id);
    const clearing = await findOrCreateAccount(qb, 'Stripe Clearing', 'Other Current Asset', 'UndepositedFunds');
    const customer = await findOrCreateCustomer(qb, {
      displayName: payment.guardian_name || payment.player_name || payment.source_label || 'Club Family',
      email: payment.family_email || `family-${payment.id}@club.local`,
    });
    const customerId = customer?.Id || customer?.id;
    if (!customerId) throw new Error('Failed to resolve QuickBooks customer');

    const incomeAccountName = INCOME_ACCOUNT_BY_TYPE[payment.charge_type] || INCOME_ACCOUNT_BY_TYPE.other;
    const incomeAccount = await findOrCreateAccount(qb, incomeAccountName, 'Income', 'ServiceFeeIncome');

    const salesReceiptBody = withLocation(
      {
        CustomerRef: { value: String(customerId) },
        TxnDate: payment.payment_date || new Date().toISOString().split('T')[0],
        DepositToAccountRef: { value: String(clearing.Id) },
        PrivateNote: `Stripe charge ${payment.transaction_reference || ''}`.trim(),
        Line: [
          {
            Amount: Number(payment.amount || 0),
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: incomeAccount.Id, name: incomeAccountName },
              ClassRef: { value: String(mapping.classId) },
            },
            Description: payment.source_label || payment.charge_type || 'Club payment',
          },
        ],
      },
      mapping.locationId,
    );
    const srRes = await qbPost(qb, 'salesreceipt', salesReceiptBody);
    const salesReceiptId = srRes?.SalesReceipt?.Id;

    let feeExpenseId = null;
    if (payment.stripe_fee > 0) {
      const feesAccount = await findOrCreateAccount(qb, 'Stripe Fees', 'Expense', 'OtherMiscellaneousServiceCost');
      const expenseBody = withLocation(
        {
          AccountRef: { value: String(clearing.Id) },
          TxnDate: payment.payment_date || new Date().toISOString().split('T')[0],
          Line: [
            {
              Amount: Number(payment.stripe_fee),
              DetailType: 'AccountBasedExpenseLineDetail',
              AccountBasedExpenseLineDetail: {
                AccountRef: { value: String(feesAccount.Id) },
                ClassRef: { value: String(mapping.classId) },
              },
              Description: `Stripe processing fee — ${payment.transaction_reference || ''}`.trim(),
            },
          ],
        },
        mapping.locationId,
      );
      const expRes = await qbPost(qb, 'purchase', expenseBody);
      feeExpenseId = expRes?.Purchase?.Id;
    }

    await svc.entities.Payment.update(payment.id, {
      qbo_entry_type: 'sales_receipt',
      qbo_entry_id: salesReceiptId || null,
      qbo_fee_entry_id: feeExpenseId || null,
    });
  } catch (err) {
    console.error('postPaymentToQbo error:', err);
    await alertBookkeeper(base44, club, payment, err.message || 'QuickBooks sync failed');
  }
}

export async function postRefundToQbo(base44, club, originalPayment, refundPayment) {
  const svc = base44.asServiceRole;
  try {
    if (!club.quickbooks_connected) return;
    if (!originalPayment.qbo_entry_id) return; // original was never synced — nothing to refund in QBO
    const mapping = await resolveMapping(base44, club, originalPayment);
    if (!mapping) {
      await svc.entities.Payment.update(refundPayment.id, { qbo_entry_type: 'blocked' }).catch(() => {});
      return;
    }
    const qb = await getClubQbConnection(base44, club.id);
    const clearing = await findOrCreateAccount(qb, 'Stripe Clearing', 'Other Current Asset', 'UndepositedFunds');
    const customer = await findOrCreateCustomer(qb, {
      displayName: originalPayment.guardian_name || originalPayment.player_name || 'Club Family',
      email: originalPayment.family_email || `family-${originalPayment.id}@club.local`,
    });
    const customerId = customer?.Id || customer?.id;
    const incomeAccountName = INCOME_ACCOUNT_BY_TYPE[originalPayment.charge_type] || INCOME_ACCOUNT_BY_TYPE.other;
    const incomeAccount = await findOrCreateAccount(qb, incomeAccountName, 'Income', 'ServiceFeeIncome');

    // Stripe doesn't return its fee on refunds, so we never reverse qbo_fee_entry_id.
    const body = withLocation(
      {
        CustomerRef: { value: String(customerId) },
        TxnDate: new Date().toISOString().split('T')[0],
        DepositToAccountRef: { value: String(clearing.Id) },
        PrivateNote: `Refund of ${originalPayment.transaction_reference || ''}`.trim(),
        Line: [
          {
            Amount: Math.abs(Number(refundPayment.amount || 0)),
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: incomeAccount.Id, name: incomeAccountName },
              ClassRef: { value: String(mapping.classId) },
            },
            Description: originalPayment.source_label || 'Refund',
          },
        ],
      },
      mapping.locationId,
    );
    const res = await qbPost(qb, 'refundreceipt', body);
    await svc.entities.Payment.update(refundPayment.id, {
      qbo_entry_type: 'refund_receipt',
      qbo_entry_id: res?.RefundReceipt?.Id || null,
    });
  } catch (err) {
    console.error('postRefundToQbo error:', err);
    await alertBookkeeper(base44, club, originalPayment, err.message || 'QuickBooks refund sync failed');
  }
}

export async function postPayoutDepositToQbo(base44, club, payout, payments) {
  try {
    if (!club.quickbooks_connected || payments.length === 0) return null;
    const qb = await getClubQbConnection(base44, club.id);
    const clearing = await findOrCreateAccount(qb, 'Stripe Clearing', 'Other Current Asset', 'UndepositedFunds');
    const bank = await findOrCreateAccount(qb, 'Bank Account', 'Bank', 'Checking');

    const body = {
      TxnDate: payout.arrival_date || new Date().toISOString().split('T')[0],
      DepositToAccountRef: { value: String(bank.Id) },
      PrivateNote: `Stripe payout ${payout.stripe_payout_id}`,
      Line: [
        {
          Amount: Number(payout.amount || 0),
          DetailType: 'DepositLineDetail',
          DepositLineDetail: { AccountRef: { value: String(clearing.Id) } },
          Description: `Net payout for ${payments.length} payment(s)`,
        },
      ],
    };
    const res = await qbPost(qb, 'deposit', body);
    return res?.Deposit?.Id || null;
  } catch (err) {
    console.error('postPayoutDepositToQbo error:', err);
    return null;
  }
}

function withLocation(body, locationId) {
  // QuickBooks only supports DepartmentRef (Location) at the transaction header level.
  return { ...body, DepartmentRef: { value: String(locationId) } };
}