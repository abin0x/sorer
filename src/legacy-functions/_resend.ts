// Minimal fetch-based stand-in for the "resend" npm client used by old actions.
export class Resend {
  constructor(private key: string) {}
  private async call(path: string, method = "GET", body?: unknown) {
    const res = await fetch(`https://api.resend.com${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { data, error: null } : { data: null, error: { message: data?.message || `Resend ${res.status}`, ...data } };
  }
  emails = { send: (b: unknown) => this.call("/emails", "POST", b) };
  domains = {
    list: () => this.call("/domains"),
    get: (id: string) => this.call(`/domains/${id}`),
    create: (b: unknown) => this.call("/domains", "POST", b),
    verify: (id: string) => this.call(`/domains/${id}/verify`, "POST"),
  };
}
