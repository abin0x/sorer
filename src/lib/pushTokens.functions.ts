import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  token: z.string().trim().min(16).max(4096).regex(/^[A-Za-z0-9:_\-.]+$/),
  platform: z.enum(["ios", "android", "web"]),
  appVersion: z.string().max(40).optional(),
});

// Saves the signed-in person's phone for push alerts. A token belongs to one
// phone, so re-registering moves it to whoever is signed in now.
export const registerPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("device_push_tokens").upsert(
      { token: data.token, platform: data.platform, app_version: data.appVersion ?? null, user_id: context.userId, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
    if (error) throw new Error(`Could not save device: ${error.message}`);
    return { ok: true };
  });

// Removes this phone on sign-out so the next person doesn't get alerts.
export const unregisterPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().min(16).max(4096) }).parse(d))
  .handler(async ({ data, context }) => {
    await (context.supabase as any).from("device_push_tokens").delete().eq("token", data.token).eq("user_id", context.userId);
    return { ok: true };
  });
