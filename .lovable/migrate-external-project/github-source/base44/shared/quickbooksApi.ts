// Shared QuickBooks API helpers used by syncToQuickBooks, syncFromQuickBooks,
// quickbooks-oauth-initiate, and quickbooks-oauth-callback.
//
// Multi-tenant model: each Club connects its OWN QuickBooks Online company via OAuth
// (quickbooks-oauth-initiate / quickbooks-oauth-callback). Tokens are stored per club in
// the ClubQuickBooksConnection entity. getClubQbConnection() resolves the current club's
// connection and auto-refreshes expired access tokens.

export async function getClubQbConnection(base44, clubId) {
  if (!clubId) {
    throw new Error('Your user is not associated with a club. Ask a platform admin to assign you to a club.');
  }
  const conns = await base44.asServiceRole.entities.ClubQuickBooksConnection.filter({ club_id: clubId });
  const conn = conns?.[0];
  if (!conn) {
    throw new Error('QuickBooks is not connected for this club. Connect it from Payments → QuickBooks.');
  }
  let accessToken = conn.access_token;
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : NaN;
  const now = Date.now();
  // Refresh if the token is missing or expires within 60 seconds.
  if (!accessToken || isNaN(expiresAt) || expiresAt - now < 60000) {
    const refreshed = await refreshQbToken(base44, conn);
    accessToken = refreshed.access_token;
  }
  const base = conn.is_sandbox
    ? 'https://sandbox-quickbooks.api.intuit.com/v3/company'
    : 'https://quickbooks.api.intuit.com/v3/company';
  return { accessToken, realmId: conn.realm_id, baseUrl: `${base}/${conn.realm_id}` };
}

async function refreshQbToken(base44, conn) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('QuickBooks OAuth credentials are not configured (QUICKBOOKS_CLIENT_ID / QUICKBOOKS_CLIENT_SECRET).');
  }
  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v2/tokens/bearer';
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refresh_token });
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Refresh failed — the club must reconnect.
    await base44.asServiceRole.entities.Club.update(conn.club_id, {
      quickbooks_connected: false,
    }).catch(() => {});
    throw new Error(data?.error_description || data?.error || 'QuickBooks token refresh failed — reconnect QuickBooks.');
  }
  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await base44.asServiceRole.entities.ClubQuickBooksConnection.update(conn.id, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: expiresAt,
  });
  return { access_token: data.access_token };
}

export async function qbQuery(qb, query) {
  const url = `${qb.baseUrl}/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${qb.accessToken}`, Accept: 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.Fault?.Error?.[0]?.Message || data?.fault?.error?.[0]?.message || `QuickBooks query failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function qbPost(qb, entity, body) {
  const res = await fetch(`${qb.baseUrl}/${entity}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${qb.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.Fault?.Error?.[0]?.Message || data?.fault?.error?.[0]?.message || `QuickBooks ${entity} request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// Find a customer in QuickBooks by email, or create one if not found.
export async function findOrCreateCustomer(qb, { displayName, email, phone }) {
  const q = `SELECT * FROM Customer WHERE PrimaryEmailAddr = '${email}' MAXRESULTS 1`;
  const qRes = await qbQuery(qb, q);
  const existing = qRes?.QueryResponse?.Customer?.[0];
  if (existing) return existing;

  const body = {
    DisplayName: displayName || email,
    PrimaryEmailAddr: { Address: email },
    PrimaryPhone: phone ? { FreeFormNumber: phone } : undefined,
  };
  const created = await qbPost(qb, 'customer', body);
  return created?.Customer;
}

// List active Classes (used to map Teams) and Departments/Locations (used to
// map Branches) from QuickBooks, for the admin mapping UI.
export async function listQboClasses(qb) {
  const data = await qbQuery(qb, "SELECT * FROM Class WHERE Active = true MAXRESULTS 200");
  return (data?.QueryResponse?.Class || []).map((c) => ({ id: c.Id, name: c.Name }));
}

export async function listQboLocations(qb) {
  const data = await qbQuery(qb, "SELECT * FROM Department WHERE Active = true MAXRESULTS 200");
  return (data?.QueryResponse?.Department || []).map((d) => ({ id: d.Id, name: d.Name }));
}

// Find a Class by exact name, or create one. Used to auto-provision a Class
// for a team when its dues plan is created/rolled over.
export async function findOrCreateClass(qb, name) {
  const q = `SELECT * FROM Class WHERE Name = '${name.replace(/'/g, "\\'")}' MAXRESULTS 1`;
  const qRes = await qbQuery(qb, q);
  const existing = qRes?.QueryResponse?.Class?.[0];
  if (existing) return { id: existing.Id, name: existing.Name };
  const created = await qbPost(qb, 'class', { Name: name });
  return { id: created?.Class?.Id, name: created?.Class?.Name };
}

// Find an Account by name (and optionally type), or create one. Used for the
// "Stripe Clearing" and "Stripe Fees" accounts the sync posts against.
export async function findOrCreateAccount(qb, name, accountType, accountSubType) {
  const q = `SELECT * FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}' MAXRESULTS 1`;
  const qRes = await qbQuery(qb, q);
  const existing = qRes?.QueryResponse?.Account?.[0];
  if (existing) return existing;
  const created = await qbPost(qb, 'account', {
    Name: name,
    AccountType: accountType,
    AccountSubType: accountSubType,
  });
  return created?.Account;
}

// Query the highest invoice number and return the next one (preserving format).
export async function nextInvoiceNumber(qb) {
  const qRes = await qbQuery(qb, "SELECT * FROM Invoice MAXRESULTS 1 STARTPOSITION 1");
  const invoices = qRes?.QueryResponse?.Invoice || [];
  if (invoices.length === 0) return 'INV-0001';
  const highest = invoices
    .map((i) => i.DocNumber)
    .filter(Boolean)
    .sort()
    .pop();
  if (!highest) return 'INV-0001';
  const match = highest.match(/^([A-Za-z-]*)(\d+)$/);
  if (!match) return `${highest}-1`;
  const prefix = match[1];
  const num = parseInt(match[2], 10) + 1;
  const padded = String(num).padStart(match[2].length, '0');
  return `${prefix}${padded}`;
}