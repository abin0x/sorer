import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { setEffectiveClubId } from "@/api/base44Client";
import { queryClientInstance } from "@/lib/query-client";
import {
  getHostname,
  isSystemDomain,
  isClubrudderDomain,
  getClubSlugFromHostname,
  getSubdomainUrl,
} from "@/lib/tenantResolver";
import { getTenantSlug, DEFAULT_BRANDING } from "@/lib/tenantBranding";
import { useTenantBranding } from "@/components/TenantBrandingProvider";
import ClubLoadingScreen from '@/components/branding/ClubLoadingScreen';

const TenantContext = createContext(null);
const VIEWING_TENANT_KEY = "viewingTenant";

/**
 * Provides tenant context for the authenticated app:
 *  - detects the club from the hostname (subdomain) OR a selected tenant slug
 *    stored in sessionStorage — lets a system user view any club on the system
 *    domain without a full page reload.
 *  - pushes the effective club id into the SDK wrapper so ALL entity queries
 *    are scoped to that tenant (data isolation).
 *  - redirects club users who land on the wrong domain to their own subdomain.
 *
 * Branding (colors, logo, app name, fonts) is handled by TenantBrandingProvider
 * which wraps this component. This provider consumes that branding and exposes
 * it via the `brand` field for backward compatibility with Layout and other
 * consumers that read tenant.brand.club_name / logo_url / etc.
 */
export function TenantProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const hostname = getHostname();
  const systemDomain = isSystemDomain(hostname);
  const clubSlug = getClubSlugFromHostname(hostname);
  const urlTenant = new URLSearchParams(location.search).get("tenant") || null;

  const { branding, setBrandingTenantId } = useTenantBranding();

  const [user, setUser] = useState(null);
  const [club, setClub] = useState(null);
  const [userClub, setUserClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clubError, setClubError] = useState('');
  const [userClubLoading, setUserClubLoading] = useState(false);
  const [resolvedClubLoading, setResolvedClubLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [viewingSlug, setViewingSlug] = useState(() => {
    if (urlTenant) {
      try { sessionStorage.setItem(VIEWING_TENANT_KEY, urlTenant); } catch { /* ignore */ }
      return urlTenant;
    }
    try { return sessionStorage.getItem(VIEWING_TENANT_KEY) || null; } catch { return null; }
  });

  // Load current user
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (active) setUser(me);
      } catch (e) {
        if (active) setClubError(e.response?.data?.error || 'Your session could not be loaded. Please sign in again.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const isSystemUser = !!(user?.is_super_admin || user?.system_role || user?.role === "admin");
  // The console is a platform workspace, even on a club hostname or with
  // a remembered tenant. Never resolve a club as a prerequisite for it.
  const systemConsoleAccess = isSystemUser && location.pathname.toLowerCase() === '/saasadmin';
  const platformAccess = systemConsoleAccess || (isSystemUser && systemDomain && !viewingSlug);
  const viewingTenant = !systemConsoleAccess && systemDomain && isSystemUser && !!viewingSlug;
  const resolvedClubSlug = systemConsoleAccess ? null : clubSlug || (viewingTenant ? viewingSlug : null);

  // Load identity with membership-checked server access after an invite or switch.
  useEffect(() => {
    if (!user || !isSystemUser || !resolvedClubSlug) { setClub(null); setResolvedClubLoading(false); return; }
    let active = true;
    setResolvedClubLoading(true); setClubError('');
    base44.functions.invoke('get-user-clubs', { slug: resolvedClubSlug }).then(({ data }) => {
      if (!data.club) throw new Error(data.error || 'Club not found.');
      if (active) setClub(data.club);
    }).catch(e => { if (active) setClubError(e.response?.data?.error || e.message); })
      .finally(() => { if (active) setResolvedClubLoading(false); });
    return () => { active = false; };
  }, [user?.id, isSystemUser, resolvedClubSlug, retry]);

  // System users on the system domain (not viewing a specific tenant) don't
  // need their personal club loaded — the system console works without it.
  // This prevents a stale/deleted club_id from blocking a system admin.
  useEffect(() => {
    const skipUserClub = platformAccess;
    if (!user?.club_id || skipUserClub) { setUserClub(null); setUserClubLoading(false); return; }
    let active = true;
    setUserClubLoading(true); setClubError('');
    base44.functions.invoke('get-user-clubs', { club_id: user.club_id }).then(({ data }) => {
      if (!data.club) throw new Error(data.error || 'Club not found.');
      if (active) setUserClub(data.club);
    }).catch(e => { if (active) setClubError(e.response?.data?.error || e.message); })
      .finally(() => { if (active) setUserClubLoading(false); });
    return () => { active = false; };
  }, [user?.club_id, retry, platformAccess]);

  // The authenticated membership, not the hostname, selects a member's club.
  // Keep members on the same origin so switching does not lose their session.

  // Effective club ID for dashboard data filtering + SDK query scoping
  const effectiveClubId = platformAccess ? null :
    isSystemUser && (clubSlug || viewingTenant) && club?.id
      ? club.id
      : user?.club_id || null;

  // Push the effective club into the SDK wrapper and invalidate cached queries
  // on a tenant switch so every page refetches for the new tenant.
  const skipInvalidate = useRef(true);
  useEffect(() => {
    setEffectiveClubId(effectiveClubId);
    if (skipInvalidate.current) {
      skipInvalidate.current = false;
    } else {
      queryClientInstance.invalidateQueries();
    }
  }, [effectiveClubId]);

  // Sync the branding provider's tenant ID when a system user views a tenant
  useEffect(() => {
    if (viewingTenant) {
      setBrandingTenantId(viewingSlug);
    } else if (systemDomain || systemConsoleAccess) {
      setBrandingTenantId("system");
    } else if (userClub?.slug) {
      setBrandingTenantId(userClub.slug);
    } else {
      setBrandingTenantId(getTenantSlug());
    }
  }, [viewingSlug, viewingTenant, userClub?.slug, systemDomain, systemConsoleAccess, setBrandingTenantId]);

  // Map the branding from TenantBrandingProvider to the legacy `brand` shape
  // so existing consumers (Layout, etc.) keep working without changes.
  const showSystemBrand = systemConsoleAccess || (systemDomain && !viewingTenant && !clubSlug);
  const activeClub = showSystemBrand ? null : (viewingTenant || (isSystemUser && clubSlug) ? club : userClub);
  const brand = {
    club_name: activeClub?.app_name || activeClub?.name || branding.appName,
    club_tagline: "Club Management",
    logo_url: activeClub?.logo_url || branding.logoUrl,
    primary_color: activeClub?.primary_color || branding.primaryColor,
    accent_color: activeClub?.secondary_color || branding.secondaryColor,
  };

  // System user selects a tenant to view (no reload — stays logged in)
  const selectTenant = (slug) => {
    try { sessionStorage.setItem(VIEWING_TENANT_KEY, slug); } catch { /* ignore */ }
    setViewingSlug(slug);
    navigate("/home");
  };
  const clearTenant = () => {
    try { sessionStorage.removeItem(VIEWING_TENANT_KEY); } catch { /* ignore */ }
    setViewingSlug(null);
    navigate("/SaaSAdmin");
  };

  const value = {
    isSystemDomain: systemConsoleAccess || systemDomain,
    isClubSubdomain: !systemDomain && !!clubSlug,
    clubSlug: clubSlug || (viewingTenant ? viewingSlug : null),
    club,
    user,
    userClub,
    isSystemUser,
    effectiveClubId,
    brand,
    loading,
    viewingTenant,
    viewingSlug,
    selectTenant,
    clearTenant,
  };

  // Do not mount club pages until the SDK scope and club identity are ready.
  // System users on the system domain (not viewing a tenant) are never
  // blocked by a stale/missing personal club — they can always reach the
  // system console.
  setEffectiveClubId(effectiveClubId);
  if (clubError && !platformAccess) return <ClubLoadingScreen error={clubError} onRetry={() => window.location.reload()} />;
  if (loading || (!platformAccess && (userClubLoading || (user?.club_id && userClub?.id !== user.club_id))) || (viewingTenant && (resolvedClubLoading || club?.slug !== viewingSlug))) {
    return <ClubLoadingScreen />;
  }
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    return {
      isSystemDomain: true,
      isClubSubdomain: false,
      clubSlug: null,
      club: null,
      user: null,
      userClub: null,
      isSystemUser: false,
      effectiveClubId: null,
      brand: {
        club_name: DEFAULT_BRANDING.appName,
        club_tagline: "Club Management",
        logo_url: DEFAULT_BRANDING.logoUrl,
        primary_color: DEFAULT_BRANDING.primaryColor,
        accent_color: DEFAULT_BRANDING.secondaryColor,
      },
      loading: true,
      viewingTenant: false,
      viewingSlug: null,
      selectTenant: () => {},
      clearTenant: () => {},
    };
  }
  return ctx;
}