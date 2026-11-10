import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAYMENT_PROVIDERS, resolvePaymentProvider } from "./paymentPreference";

const provider = z.enum(PAYMENT_PROVIDERS as ["stripe", "echelon"]);

export const getPaymentPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clubId: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const s = await import("./integrations.server");
    const db = (await s.admin()) as any;
    const [{ data: club }, { data: plat }, { data: rows }, { data: owner }] = await Promise.all([
      sb.from("clubs").select("preferred_payment_provider").eq("id", data.clubId).maybeSingle(),
      // Only the non-secret provider name is read; direct table access is denied to app users.
      db.from("platform_payment_settings").select("preferred_provider").eq("id", true).maybeSingle(),
      sb.from("club_integrations").select("provider,status").eq("club_id", data.clubId).in("provider", PAYMENT_PROVIDERS),
      sb.rpc("is_system_owner"),
    ]);
    const connected = (rows ?? []).filter((r: any) => r.status === "connected").map((r: any) => r.provider);
    const clubPreferred = club?.preferred_payment_provider ?? null;
    const platformDefault = plat?.preferred_provider ?? "stripe";
    return { clubPreferred, platformDefault, connected, active: resolvePaymentProvider(clubPreferred, platformDefault, connected), isSystemOwner: owner === true };
  });

export const setClubPaymentPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clubId: z.string().min(1).max(100), provider: provider.nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    const db = await s.admin();
    const { error } = await (db as any).from("clubs").update({ preferred_payment_provider: data.provider }).eq("id", data.clubId);
    if (error) throw new Error("Preference could not be saved.");
    return { ok: true };
  });

export const setPlatformPaymentDefault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ provider }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: owner } = await (context.supabase as any).rpc("is_system_owner");
    if (owner !== true) throw new Error("Only the app owner can change the app-wide default.");
    const s = await import("./integrations.server");
    const db = await s.admin();
    const { error } = await (db as any).from("platform_payment_settings")
      .upsert({ id: true, preferred_provider: data.provider, updated_at: new Date().toISOString() });
    if (error) throw new Error("Default could not be saved.");
    return { ok: true };
  });
