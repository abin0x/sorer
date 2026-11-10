// @ts-nocheck
// Shared helpers for loading tenant-specific credentials from ClubCredential.
// Each club can store its own API keys and OAuth settings, which take priority
// over any platform-level fallback. Used by backend functions that need
// per-tenant credentials (Google Maps, etc.).

/**
 * Load the club's Google Maps API key from ClubCredential.
 * Returns undefined if the club hasn't set one (caller falls back to LLM estimation).
 */
export async function loadClubGoogleMapsKey(
  svc: any,
  clubId: string
): Promise<string | undefined> {
  if (!clubId) return undefined;
  try {
    const page = await svc.entities.ClubCredential.filter(
      { club_id: clubId },
      { limit: 1 }
    );
    const cred = page?.items?.[0] || (Array.isArray(page) ? page[0] : null);
    if (cred?.google_maps_api_key) return cred.google_maps_api_key;
  } catch (e) {
    // ignore — fall through to undefined
  }
  return undefined;
}