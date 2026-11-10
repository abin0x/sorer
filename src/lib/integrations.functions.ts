import { isTrustedOrigin } from "./trustedOrigin";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const clubInput = z.object({ clubId: z.string().min(1).max(100) });
const originSchema = z.string().url().refine(isTrustedOrigin, "Invalid origin").transform((u) => new URL(u).origin);

export const listMyClubs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("my_clubs");
    if (error) throw new Error(error.message);
    return (data || []) as { club_id: string; name: string; role: "owner" | "admin" | "member" }[];
  });

export const getIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clubInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertClubAdmin } = await import("./integrations.server");
    await assertClubAdmin(context.supabase, data.clubId);
    const { data: rows, error } = await (context.supabase as any)
      .from("club_integrations")
      .select("provider,status,external_account_id,display_name,metadata,connected_at,last_synced_at,last_error")
      .eq("club_id", data.clubId);
    if (error) throw new Error(error.message);
    return rows as any[];
  });

// ---------------- Stripe ----------------
export const startStripeConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clubInput.extend({ origin: originSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    const db = await s.admin();
    const { data: row } = await (db as any).from("club_integrations")
      .select("external_account_id").eq("club_id", data.clubId).eq("provider", "stripe").maybeSingle();
    let accountId = row?.external_account_id as string | undefined;
    if (!accountId) {
      const { data: club } = await (db as any).from("clubs").select("name,billing_email,primary_contact_email").eq("id", data.clubId).maybeSingle();
      const form: Record<string, string> = { type: "standard", "metadata[club_id]": data.clubId };
      const email = club?.billing_email || club?.primary_contact_email;
      if (email) form["email"] = email;
      if (club?.name) form["business_profile[name]"] = club.name;
      let acct: any;
      try { acct = await s.stripe("/accounts", "POST", form); }
      catch (e: any) {
        const msg = String(e?.message ?? e);
        if (msg.includes("signed up for Connect")) return { url: null as string | null, error: "Stripe Connect isn't turned on for the platform Stripe account yet. Enable it at https://dashboard.stripe.com/connect (same test/live mode as your key), then try again." };
        return { url: null as string | null, error: "Stripe couldn't create the club account. Please try again later." };
      }
      accountId = acct.id as string;
      await s.setIntegration(data.clubId, "stripe", {
        status: "pending", external_account_id: accountId, display_name: club?.name ?? null, connected_by: context.userId,
      });
    }
    const back = `${data.origin}/settings/integrations?club=${encodeURIComponent(data.clubId)}&provider=stripe`;
    const link = await s.stripe("/account_links", "POST", {
      account: accountId!, refresh_url: back, return_url: back, type: "account_onboarding",
    });
    return { url: link.url as string | null, error: null as string | null };
  });

export const refreshStripeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clubInput.parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    const db = await s.admin();
    const { data: row } = await (db as any).from("club_integrations")
      .select("external_account_id").eq("club_id", data.clubId).eq("provider", "stripe").maybeSingle();
    if (!row?.external_account_id) return { status: "disconnected" };
    const acct = await s.stripe(`/accounts/${row.external_account_id}`);
    const ready = !!acct.charges_enabled && !!acct.details_submitted;
    await s.setIntegration(data.clubId, "stripe", {
      status: ready ? "connected" : "pending",
      display_name: acct.business_profile?.name || acct.email || null,
      metadata: { charges_enabled: acct.charges_enabled, payouts_enabled: acct.payouts_enabled, email: acct.email, country: acct.country },
      connected_at: ready ? new Date().toISOString() : null,
      last_synced_at: new Date().toISOString(),
      last_error: null,
    });
    await (db as any).from("clubs").update({ stripe_account_id: row.external_account_id }).eq("id", data.clubId);
    return { status: ready ? "connected" : "pending" };
  });

// ---------------- QuickBooks ----------------
export const testQuickBooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clubInput.parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    const db = await s.admin();
    const { data: row } = await (db as any).from("club_integrations")
      .select("external_account_id").eq("club_id", data.clubId).eq("provider", "quickbooks").maybeSingle();
    if (!row?.external_account_id) throw new Error("QuickBooks is not connected.");
    try {
      const info = await s.qbGet(data.clubId, row.external_account_id, `/companyinfo/${row.external_account_id}`);
      const name = info?.CompanyInfo?.CompanyName ?? null;
      await s.setIntegration(data.clubId, "quickbooks", { status: "connected", display_name: name, last_synced_at: new Date().toISOString(), last_error: null });
      return { companyName: name };
    } catch (e: any) {
      await s.setIntegration(data.clubId, "quickbooks", { status: "error", last_error: String(e.message).slice(0, 500) });
      throw e;
    }
  });

// ---------------- Resend ----------------
export const saveResendKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clubInput.extend({
    apiKey: z.string().trim().regex(/^re_[A-Za-z0-9_]{10,200}$/, "That doesn't look like a Resend API key (it starts with re_)."),
    fromEmail: z.string().trim().email().max(255),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    const domains = await s.resend(data.apiKey, "/domains").catch((e: Error) => {
      if (/restricted|401|403/i.test(e.message)) return { data: [] };
      throw e;
    });
    await s.setSecret(data.clubId, "resend", { api_key: data.apiKey });
    await s.setIntegration(data.clubId, "resend", {
      status: "connected",
      external_account_id: data.fromEmail,
      display_name: data.fromEmail,
      metadata: { domains: (domains?.data || []).map((d: any) => ({ name: d.name, status: d.status })) },
      connected_by: context.userId,
      connected_at: new Date().toISOString(),
      last_error: null,
    });
    return { ok: true };
  });

export const sendResendTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clubInput.extend({ to: z.string().trim().email().max(255) }).parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    const secret = await s.getSecret(data.clubId, "resend");
    const db = await s.admin();
    const { data: row } = await (db as any).from("club_integrations")
      .select("external_account_id").eq("club_id", data.clubId).eq("provider", "resend").maybeSingle();
    if (!secret?.api_key || !row?.external_account_id) throw new Error("Resend is not connected.");
    await s.resend(secret.api_key, "/emails", "POST", {
      from: row.external_account_id,
      to: [data.to],
      subject: "ClubRudder test email",
      html: "<p>Your club's email connection is working.</p>",
    });
    await s.setIntegration(data.clubId, "resend", { last_synced_at: new Date().toISOString(), last_error: null });
    return { ok: true };
  });

// ---------------- Disconnect ----------------
export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clubInput.extend({ provider: z.enum(["stripe", "quickbooks", "resend"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    await s.clearSecret(data.clubId, data.provider);
    await s.setIntegration(data.clubId, data.provider, {
      status: "disconnected", external_account_id: null, display_name: null, metadata: {}, connected_at: null, last_error: null,
    });
    return { ok: true };
  });

// ---------------- Club invitations (sent via the club's own Resend) ----------------
const optClub = z.object({ clubId: z.string().min(1).max(100).optional() });

async function resolveClub(supabase: any, clubId?: string) {
  if (clubId) return clubId;
  const { data } = await supabase.rpc("my_clubs");
  const c = (data || []).find((x: any) => x.role !== "member") || (data || [])[0];
  if (!c) throw new Error("You aren't a member of any club.");
  return c.club_id as string;
}

export const checkClubResend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => optClub.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    const clubId = await resolveClub(context.supabase, data.clubId);
    await s.assertClubAdmin(context.supabase, clubId);
    const secret = await s.getSecret(clubId, "resend");
    const db = await s.admin();
    const { data: row } = await (db as any).from("club_integrations")
      .select("status,external_account_id").eq("club_id", clubId).eq("provider", "resend").maybeSingle();
    const connected = !!secret?.api_key && row?.status === "connected" && !!row?.external_account_id;
    return { connected, from: row?.external_account_id ?? null, reason: connected ? null : "not_connected", clubId };
  });

export const inviteClubMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => optClub.extend({
    origin: originSchema,
    invitees: z.array(z.object({
      email: z.string().trim().email().max(255),
      full_name: z.string().trim().max(200).optional().default(""),
      role: z.string().trim().min(1).max(60),
    })).min(1).max(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    const clubId = await resolveClub(context.supabase, data.clubId);
    // Caller must manage this club (owner/admin membership or the service-managed owner grant).
    await s.assertClubAdmin(context.supabase, clubId);
    const db = await s.admin();
    const secret = await s.getSecret(clubId, "resend").catch(() => null);
    const { data: row } = await (db as any).from("club_integrations")
      .select("external_account_id,status").eq("club_id", clubId).eq("provider", "resend").maybeSingle();
    // Email is optional: without the club's Resend we still create the invitation and return a shareable link.
    const canEmail = !!secret?.api_key && !!row?.external_account_id;
    const { data: club } = await (db as any).from("clubs").select("name").eq("id", clubId).maybeSingle();
    const clubName = club?.name || "your club";
    const inviter = (context.claims as any)?.email || "";
    const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const roleLabel = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const results: any[] = [];
    for (const inv of data.invitees) {
      const email = inv.email.toLowerCase();
      // Reuse an open invitation for the same person and role so links already shared keep working.
      const { data: existing } = await (db as any).from("club_invitations")
        .select("id,token").eq("club_id", clubId).eq("email", email).eq("role", inv.role).eq("status", "pending")
        .order("created_date", { ascending: false }).limit(1).maybeSingle();
      let rec = existing;
      if (!rec) {
        const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
        const ins = await (db as any).from("club_invitations").insert({
          club_id: clubId, club_name: clubName, email, invitee_name: inv.full_name || null,
          role: inv.role, role_label: roleLabel(inv.role), token, status: "pending", invited_by_email: inviter,
          created_by: inviter || null,
        }).select("id,token").single();
        if (ins.error) { results.push({ email, success: false, error: "The invitation could not be saved." }); continue; }
        rec = ins.data;
      }
      const link = `${data.origin}/accept-invite?invite=${rec.token}`;
      if (!canEmail) {
        await (db as any).from("club_invitations").update({ last_error: null }).eq("id", rec.id);
        results.push({ email, success: true, emailed: false, link, note: "Email isn't connected for this club — share the link yourself." });
        continue;
      }
      try {
        const sent: any = await s.resend(secret!.api_key as string, "/emails", "POST", {
          from: row!.external_account_id,
          to: [email],
          subject: `You're invited to join ${clubName} on ClubRudder`,
          html: `<p>Hi ${esc(inv.full_name || "there")},</p><p>${esc(inviter || "A club admin")} invited you to join <strong>${esc(clubName)}</strong> as ${esc(roleLabel(inv.role))}.</p><p><a href="${link}">Accept your invitation</a></p><p>Sign in or create an account with this email address (${esc(email)}) and you'll be added automatically.</p>`,
        });
        await (db as any).from("club_invitations").update({ sent_date: new Date().toISOString(), resend_email_id: sent?.id ?? null, last_error: null }).eq("id", rec.id);
        results.push({ email, success: true, emailed: true, link });
      } catch (e: any) {
        // Email failed but the invitation is valid — hand back the link so the admin can share it.
        await (db as any).from("club_invitations").update({ last_error: `Email not delivered: ${String(e?.message || e).slice(0, 400)}` }).eq("id", rec.id);
        results.push({ email, success: true, emailed: false, link, note: "The email couldn't be sent — share the link yourself." });
      }
    }
    const sentCount = results.filter((r) => r.success).length;
    return { results, sent: sentCount, failed: results.length - sentCount, email_connected: canEmail };
  });
