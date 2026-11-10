import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from '@/lib/router-compat';
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
      } catch {
        /* not logged in — public page */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const isSystemUser = !!(user?.is_super_admin || user?.system_role || user?.role === "admin");
  const systemConsoleAccess = isSystemUser && location.pathname.toLowerCase() === "/saasadmin";
  const viewingTenant = !systemConsoleAccess && systemDomain && isSystemUser && !!viewingSlug;
  const resolvedClubSlug = systemConsoleAccess ? null : clubSlug || (viewingTenant ? viewingSlug : null);

  // Load the resolved club (subdomain or selected tenant) — for data scoping
  useEffect(() => {
    if (!resolvedClubSlug) { setClub(null); return; }
    let active = true;
    (async () => {
      try {
        const rows = await base44.entities.Club.filter({ slug: resolvedClubSlug });
        if (active) setClub(rows?.[0] || null);
      } catch {
        if (active) setClub(null);
      }
    })();
    return () => { active = false; };
  }, [resolvedClubSlug]);

  // Load the user's own club (for redirect logic)
  useEffect(() => {
    if (!user?.club_id) { setUserClub(null); return; }
    let active = true;
    (async () => {
      try {
        const c = await base44.entities.Club.get(user.club_id);
        if (active) setUserClub(c);
      } catch {
        if (active) setUserClub(null);
      }
    })();
    return () => { active = false; };
  }, [user?.club_id]);

  // Redirect logic — only fires on real clubrudder.com domains
  useEffect(() => {
    if (loading || !user || !isClubrudderDomain(hostname)) return;
    if (viewingTenant) return;
    if (systemDomain) {
      if (!isSystemUser && userClub?.slug) {
        const target = getSubdomainUrl(userClub.slug);
        if (target) {
          try { if (new URL(target).hostname !== hostname) window.location.href = target; } catch { /* ignore */ }
        }
      }
    } else {
      if (!isSystemUser && userClub?.slug && clubSlug && userClub.slug !== clubSlug) {
        const target = getSubdomainUrl(userClub.slug);
        if (target) window.location.href = target;
      }
    }
  }, [loading, user, userClub, systemDomain, isSystemUser, clubSlug, hostname, viewingTenant]);

  // Effective club ID for dashboard data filtering + SDK query scoping.
  // While a system owner's selected club is still loading, scope to a
  // placeholder that matches nothing so no other club's data can show.
  const actingAsClub = isSystemUser && (clubSlug || viewingTenant);
  const effectiveClubId = systemConsoleAccess ? null :
    actingAsClub
      ? (club?.id || "00000000-0000-0000-0000-000000000000")
      : user?.club_id || null;

  const strictScope = !!actingAsClub && !systemConsoleAccess;
  // Push the scope synchronously during render so child queries (whose
  // effects run before ours) never fire with the previous/unscoped club.
  setEffectiveClubId(effectiveClubId, strictScope);
  const skipInvalidate = useRef(true);
  useEffect(() => {
    setEffectiveClubId(effectiveClubId, strictScope);
    if (skipInvalidate.current) {
      skipInvalidate.current = false;
    } else {
      queryClientInstance.invalidateQueries();
    }
  }, [effectiveClubId, strictScope]);

  // Sync the branding provider's tenant ID when a system user views a tenant
  useEffect(() => {
    if (viewingTenant) {
      setBrandingTenantId(viewingSlug);
    } else {
      setBrandingTenantId(systemDomain || systemConsoleAccess ? "system" : getTenantSlug());
    }
  }, [viewingSlug, viewingTenant, systemConsoleAccess, systemDomain, setBrandingTenantId]);

  // Map the branding from TenantBrandingProvider to the legacy `brand` shape
  // so existing consumers (Layout, etc.) keep working without changes.
  const brand = {
    club_name: branding.appName,
    club_tagline: "Club Management",
    logo_url: branding.logoUrl,
    primary_color: branding.primaryColor,
    accent_color: branding.secondaryColor,
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