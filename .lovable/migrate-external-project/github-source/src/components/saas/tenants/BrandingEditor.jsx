import React, { useRef, useState } from "react";
import { Loader2, Upload, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { deriveBrandColorsClient } from "@/lib/tenantBranding";

/**
 * Branding editor for a single tenant (Club record).
 * The Club entity is the single source of truth for tenant branding —
 * edited only by the system owner in the System Console.
 */
export default function BrandingEditor({ form, set }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      set({ logo_url: file_url });
      toast.success("Logo uploaded — click Save to apply");
    } catch (err) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Building2 className="w-4 h-4 text-indigo-600" />
        <h4 className="font-semibold text-sm">Tenant Branding</h4>
      </div>

      {/* App name (display name override) */}
      <div className="space-y-1.5">
        <Label>App Display Name</Label>
        <Input
          value={form.app_name || ""}
          onChange={(e) => set({ app_name: e.target.value })}
          placeholder={form.name || "Defaults to club name"}
        />
        <p className="text-xs text-slate-400">Shown in the sidebar, header, and browser tab. Falls back to the club name when blank.</p>
      </div>

      {/* Logo upload */}
      <div className="space-y-1.5">
        <Label>Club Logo</Label>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Building2 className="w-6 h-6 text-slate-300" />
            )}
          </div>
          <div className="flex-1 space-y-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
              {uploading ? "Uploading…" : "Upload Logo"}
            </Button>
            {form.logo_url && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set({ logo_url: "" })}>
                Remove
              </Button>
            )}
            <p className="text-xs text-slate-400">PNG, JPG, or SVG. Max 2MB.</p>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Primary Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={/^#([0-9a-f]{6})$/i.test(form.primary_color) ? form.primary_color : "#399F7D"}
              onChange={(e) => set({ primary_color: e.target.value })}
              className="w-10 h-9 rounded border border-slate-200 shrink-0 cursor-pointer"
            />
            <Input value={form.primary_color || ""} onChange={(e) => set({ primary_color: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Secondary Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={/^#([0-9a-f]{6})$/i.test(form.secondary_color) ? form.secondary_color : "#F59E0B"}
              onChange={(e) => set({ secondary_color: e.target.value })}
              className="w-10 h-9 rounded border border-slate-200 shrink-0 cursor-pointer"
            />
            <Input value={form.secondary_color || ""} onChange={(e) => set({ secondary_color: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Live preview with derived tokens */}
      {(() => {
        const d = deriveBrandColorsClient(form.primary_color || "#399F7D");
        const brand = d ? `rgb(${d.brand500})` : "#399F7D";
        const onColor = d ? `rgb(${d.brandOn})` : "#fff";
        const brand50 = d ? `rgb(${d.brand50})` : "#f0fdf4";
        const brand700 = d ? `rgb(${d.brand700})` : "#0f5132";
        const brand600 = d ? `rgb(${d.brand600})` : "#399F7D";
        const ring = d ? `rgb(${d.brandRing} / 0.35)` : "rgba(57,159,125,0.35)";
        return (
          <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Live Preview (derived tokens)</p>
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <span className="font-semibold text-sm truncate">{form.app_name || form.name || "Your Club"}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="text-xs font-semibold rounded-md px-3 py-2" style={{ background: brand, color: onColor }}>
                  Primary Button
                </button>
                <button className="text-xs font-semibold rounded-md px-3 py-2 border-2 bg-transparent" style={{ borderColor: brand, color: brand700 }}>
                  Secondary
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-20 shrink-0">Nav active:</span>
                <div className="flex-1 rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: brand50, color: brand700 }}>
                  Active Nav Item
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-20 shrink-0">Row select:</span>
                <div className="flex-1 rounded-md px-3 py-1.5 text-xs border-l-2" style={{ background: brand50, borderLeftColor: brand, color: "#2A2E37" }}>
                  Selected table row
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-20 shrink-0">Focus ring:</span>
                <input
                  className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs outline-none"
                  style={{ boxShadow: `0 0 0 3px ${ring}` }}
                  placeholder="Focus ring preview"
                />
              </div>

              <div className="flex items-end justify-between pt-1">
                <div>
                  <div className="text-2xl font-bold" style={{ color: brand }}>128</div>
                  <div className="text-xs text-slate-400">Hero KPI number</div>
                </div>
                <span className="text-xs font-semibold rounded-full px-2.5 py-0.5" style={{ background: "rgb(236 253 243)", color: "rgb(10 107 52)" }}>
                  Active
                </span>
              </div>

              {d?.shifted && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                  Brand color was auto-adjusted for contrast compliance.
                </p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}