import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Routes that are platform-level marketing pages — they always use the
 * root/system color scheme, never the resolved tenant's branding, even
 * when visited from a club subdomain.
 */
const PLATFORM_PUBLIC_ROUTES = new Set([
  "/", "/why-clubrudder", "/pricing", "/Features", "/FAQ", "/features", "/faq",
  "/demo", "/demo-access", "/request-access", "/status",
  "/gallery", "/ScreenGallery", "/create-club",
  "/privacy-policy", "/terms-of-service",
]);

function isPlatformPublicRoute(pathname) {
  if (PLATFORM_PUBLIC_ROUTES.has(pathname)) return true;
  if (pathname.startsWith("/help")) return true;
  return false;
}
import {
  getTenantSlug,
  getCachedBranding,
  setCachedBranding,
  applyBrandingToDOM,
  DEFAULT_BRANDING,
} from "@/lib/tenantBranding";
import { isSystemDomain } from "@/lib/tenantResolver";

const BrandingContext = createContext(null);

/**
 * Multi-tenant branding provider.
 *
 * The Club entity is the single source of truth for tenant branding
 * (logo_url, primary_color, secondary_color, app_name) — edited only by the
 * system owner in the System Console. This provider resolves the current
 * tenant from the subdomain, fetches the matching Club record, and injects
 * its colors / logo / app name as CSS custom properties on :root. Falls back
 * to the system-level branding (from AppConfig, set in the console's Config
 * tab) when no club is resolved (i.e. on the platform domain).
 *
 * Branding is cached in localStorage so initBrandingFromCache() (called in
 * main.jsx before React mounts) can apply it synchronously and prevent any
 * flash of the wrong theme on page reload.
 *
 * Exposes setBrandingTenantId() so TenantContext can override the tenant
 * (by club slug) when a system user views a specific club from the console.
 */
export function TenantBrandingProvider({ children }) {
  const systemDomain = isSystemDomain();
  const location = useLocation();
  const forceSystemBrand = isPlatformPublicRoute(location.pathname);
  const [tenantSlug, setTenantSlug] = useState(() => {
    if (systemDomain) {
      try {
        const viewing = sessionStorage.getItem("viewingTenant");
        if (viewing) return viewing;
      } catch {
        /* ignore */
      }
      return "system";
    }
    return getTenantSlug();
  });

  // Fetch the tenant's Club record (skip for the system tenant)
  const { data: club } = useQuery({
    queryKey: ["tenant-branding-club", tenantSlug],
    queryFn: async () => {
      if (tenantSlug === "system") return null;
      try {
        const rows = await base44.entities.Club.filter({ slug: tenantSlug });
        return rows?.[0] || null;
      } catch {
        return null;
      }
    },
    enabled: tenantSlug !== "system",
    staleTime: 5 * 60 * 1000,
  });

  // Fetch the system-level branding from AppConfig (always, as the fallback)
  const { data: systemTheme } = useQuery({
    queryKey: ["system-theme"],
    queryFn: async () => {
      try {
        const rows = await base44.entities.AppConfig.filter({
          config_key: "system_theme",
        });
        return rows?.[0]?.config_value || null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Compute the final branding: Club (tenant) → system theme → defaults
  const systemBranding = systemTheme
    ? {
        tenantSlug: "system",
        appName: systemTheme.club_name || DEFAULT_BRANDING.appName,
        logoUrl: systemTheme.logo_url || DEFAULT_BRANDING.logoUrl,
        primaryColor: systemTheme.primary_color || DEFAULT_BRANDING.primaryColor,
        secondaryColor: systemTheme.accent_color || DEFAULT_BRANDING.secondaryColor,
      }
    : DEFAULT_BRANDING;

  const branding =
    tenantSlug === "system"
      ? systemBranding
      : club
      ? {
          tenantSlug,
          appName: club.app_name || club.name,
          logoUrl: club.logo_url || "",
          primaryColor: club.primary_color || DEFAULT_BRANDING.primaryColor,
          secondaryColor: club.secondary_color || DEFAULT_BRANDING.secondaryColor,
          derivedBrandColors: club.derived_brand_colors || {},
        }
      : { ...systemBranding, tenantSlug };

  // Platform-level public pages always use the root/system color scheme,
  // never the resolved tenant's branding — even on a club subdomain.
  const effectiveBranding = forceSystemBrand ? systemBranding : branding;

  // Cache + apply branding to the DOM whenever it changes.
  // Don't pollute the tenant cache when we're forcing the system brand.
  useEffect(() => {
    if (!forceSystemBrand) {
      setCachedBranding(tenantSlug, branding);
    }
    applyBrandingToDOM(effectiveBranding);
  }, [effectiveBranding, tenantSlug, forceSystemBrand, branding]);

  const value = {
    branding: effectiveBranding,
    tenantSlug,
    isSystemDomain: systemDomain,
    setBrandingTenantId: setTenantSlug,
  };

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useTenantBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return {
      branding: DEFAULT_BRANDING,
      tenantSlug: "system",
      isSystemDomain: true,
      setBrandingTenantId: () => {},
    };
  }
  return ctx;
}