import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getClubQbConnection, qbQuery } from '../../shared/quickbooksApi.ts';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'bookkeeper'];

function canSync(user) {
  return user && (user.role === 'admin' || ADMIN_ROLES.includes(user.custom_role));
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canSync(user)) return Response.json({ error: 'Forbidden — finance access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { entity_type = 'customers' } = body;

    const qb = await getClubQbConnection(base44, user.club_id);

    if (entity_type === 'customers') {
      const data = await qbQuery(qb, 'SELECT * FROM Customer MAXRESULTS 100');
      const customers = data?.QueryResponse?.Customer || [];
      return Response.json({
        success: true,
        entity_type: 'customers',
        count: customers.length,
        data: customers.map((c) => ({
          Id: c.Id,
          DisplayName: c.DisplayName,
          Email: c.PrimaryEmailAddr?.Address,
          Phone: c.PrimaryPhone?.FreeFormNumber,
          Balance: c.Balance,
        })),
      });
    }

    if (entity_type === 'accounts') {
      const data = await qbQuery(qb, "SELECT * FROM Account WHERE AccountType = 'Income' MAXRESULTS 50");
      const accounts = data?.QueryResponse?.Account || [];
      return Response.json({
        success: true,
        entity_type: 'accounts',
        count: accounts.length,
        data: accounts.map((a) => ({
          Id: a.Id,
          Name: a.Name,
          AccountType: a.AccountType,
          CurrentBalance: a.CurrentBalance,
        })),
      });
    }

    if (entity_type === 'invoices') {
      const data = await qbQuery(qb, 'SELECT * FROM Invoice MAXRESULTS 50 STARTPOSITION 1');
      const invoices = data?.QueryResponse?.Invoice || [];
      return Response.json({
        success: true,
        entity_type: 'invoices',
        count: invoices.length,
        data: invoices.map((i) => ({
          Id: i.Id,
          DocNumber: i.DocNumber,
          CustomerRef: i.CustomerRef,
          TotalAmt: i.TotalAmt,
          Balance: i.Balance,
          TxnDate: i.TxnDate,
        })),
      });
    }

    return Response.json({ error: 'Unsupported entity_type. Use customers, accounts, or invoices.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}