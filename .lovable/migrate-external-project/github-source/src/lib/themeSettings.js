import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";

const CONFIG_KEY = "theme_settings";

export const DEFAULT_THEME = {
  primary_color: "#4f46e5", // indigo
  accent_color: "#0ea5e9", // sky
  club_name: "Club Rudder",
  club_tagline: "Multi-Club Operations Platform",
  logo_url: "",
};

const PRESETS = [
  { name: "Jaguars Emerald", primary_color: "#1a936f", accent_color: "#f2994a" },
  { name: "Ocean Blue", primary_color: "#2d6cdf", accent_color: "#f5a623" },
  { name: "Royal Purple", primary_color: "#7c5cbf", accent_color: "#e0567a" },
  { name: "Sunset Coral", primary_color: "#e0567a", accent_color: "#2d6cdf" },
  { name: "Forest Pine", primary_color: "#2d6a4f", accent_color: "#e76f51" },
  { name: "Midnight Indigo", primary_color: "#4361ee", accent_color: "#f72585" },
];
export { PRESETS };

/**
 * Convert a hex color (#rrggbb) to an "H S% L%" channel string for CSS variables.
 */
export function hexToHslChannels(hex) {
  if (!hex) return null;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

/**
 * Derive a foreground channel string that stays legible on a given background HSL.
 */
function deriveForeground(hslStr) {
  const [h, s, l] = hslStr.split(" ").map((v) => parseFloat(v));
  const light = l > 55 ? Math.max(6, 100 - l - 50) : Math.min(98, 100 - l + 45);
  return `${h} ${s}% ${light}%`;
}

/**
 * Apply primary + accent colors to the document root as CSS variables.
 */
export function applyThemeColors(primaryHex, accentHex) {
  const root = document.documentElement;
  if (primaryHex) {
    const p = hexToHslChannels(primaryHex);
    if (p) {
      root.style.setProperty("--primary", p);
      root.style.setProperty("--primary-foreground", deriveForeground(p));
      root.style.setProperty("--ring", p);
      root.style.setProperty("--sidebar-primary", p);
      root.style.setProperty("--sidebar-primary-foreground", deriveForeground(p));
      root.style.setProperty("--sidebar-ring", p);
      root.style.setProperty("--chart-1", p);
    }
  }
  if (accentHex) {
    const a = hexToHslChannels(accentHex);
    if (a) {
      root.style.setProperty("--accent", a);
      root.style.setProperty("--accent-foreground", deriveForeground(a));
      root.style.setProperty("--chart-2", a);
    }
  }
}

/**
 * Clear any JS-applied overrides so the stylesheet defaults take over again.
 */
export function clearThemeColors() {
  const root = document.documentElement;
  [
    "--primary", "--primary-foreground", "--ring",
    "--sidebar-primary", "--sidebar-primary-foreground", "--sidebar-ring",
    "--chart-1", "--accent", "--accent-foreground", "--chart-2",
  ].forEach((k) => root.style.removeProperty(k));
}

/**
 * Hook: loads the saved theme settings (colors + club identity), applies them on mount,
 * and exposes a save function. Used once at the Layout level so every page inherits
 * the admin-chosen color scheme and club branding.
 */
export function useThemeSettings() {
  const queryClient = useQueryClient();
  const { effectiveClubId } = useTenant();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["theme-settings", effectiveClubId],
    queryFn: async () => {
      try {
        const rows = await base44.entities.AppConfig.filter({ config_key: CONFIG_KEY, club_id: effectiveClubId || null });
        const row = rows?.[0];
        if (row?.config_value) {
          return {
            id: row.id,
            primary_color: row.config_value.primary_color || DEFAULT_THEME.primary_color,
            accent_color: row.config_value.accent_color || DEFAULT_THEME.accent_color,
            club_name: row.config_value.club_name || DEFAULT_THEME.club_name,
            club_tagline: row.config_value.club_tagline || DEFAULT_THEME.club_tagline,
            logo_url: row.config_value.logo_url || "",
          };
        }
      } catch (e) {
        /* AppConfig may be empty — fall through to defaults */
      }
      return { id: null, ...DEFAULT_THEME };
    },
    staleTime: 60_000,
  });

  // Apply colors whenever settings change
  React.useEffect(() => {
    if (settings) {
      applyThemeColors(settings.primary_color, settings.accent_color);
    }
  }, [settings]);

  const save = async (values) => {
    const { primary_color, accent_color, club_name, club_tagline, logo_url } = values;
    const existing = await base44.entities.AppConfig.filter({ config_key: CONFIG_KEY, club_id: effectiveClubId || null });
    const row = existing?.[0];
    const value = { primary_color, accent_color, club_name, club_tagline, logo_url };
    if (row?.id) {
      await base44.entities.AppConfig.update(row.id, { config_value: value });
    } else {
      await base44.entities.AppConfig.create({ config_key: CONFIG_KEY, config_value: value, club_id: effectiveClubId || null });
    }
    queryClient.invalidateQueries({ queryKey: ["theme-settings"] });
  };

  return { settings: settings || { ...DEFAULT_THEME }, isLoading, save };
}