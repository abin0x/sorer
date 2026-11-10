// Echelon runs on the NMI-compatible gateway. We use its Three-Step Redirect
// API: card details are posted by the family's browser straight to the
// gateway, so card numbers never touch Club Rudder servers.
const gateway = () => (process.env["ECHELON_GATEWAY_URL"] || "https://secure.nmi.com").replace(/\/$/, "");
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? "";
const x = (v: unknown) => String(v ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] as string);

async function post(xml: string) {
  const res = await fetch(`${gateway()}/api/v2/three-step`, { method: "POST", headers: { "Content-Type": "text/xml" }, body: xml });
  const text = await res.text();
  if (!res.ok) throw new Error(`Echelon gateway error (${res.status})`);
  return text;
}

export function parseEchelonResponse(xml: string) {
  return {
    result: tag(xml, "result"), text: tag(xml, "result-text"), formUrl: tag(xml, "form-url"),
    transactionId: tag(xml, "transaction-id"), orderId: tag(xml, "order-id"), amount: tag(xml, "amount"),
  };
}

export async function echelonStartSale(o: { key: string; amount: number; orderId: string; redirectUrl: string; email?: string; description?: string }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><sale><api-key>${x(o.key)}</api-key><redirect-url>${x(o.redirectUrl)}</redirect-url><amount>${o.amount.toFixed(2)}</amount><currency>USD</currency><order-id>${x(o.orderId)}</order-id><order-description>${x((o.description || "").slice(0, 200))}</order-description>${o.email ? `<billing><email>${x(o.email)}</email></billing>` : ""}</sale>`;
  const r = parseEchelonResponse(await post(xml));
  if (r.result !== "1" || !r.formUrl) throw new Error(r.text || "Echelon could not start the payment.");
  return r.formUrl;
}

export async function echelonCompleteSale(key: string, tokenId: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><complete-action><api-key>${x(key)}</api-key><token-id>${x(tokenId)}</token-id></complete-action>`;
  return parseEchelonResponse(await post(xml));
}
