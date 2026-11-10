import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_MODULES } from "@/lib/platformModules";
import { applyThemeColors } from "@/lib/themeSettings";

const SYSTEM_THEME_KEY = "system_theme";
const PLAN_TIERS = ["starter", "standard", "pro", "enterprise"];

export default function ConfigTab({ plans, loading, onReload }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState({});
  const [brand, setBrand] = useState({ club_name: "Club Rudder", club_tagline: "Multi-Club Operations Platform", primary_color: "#4f46e5", accent_color: "#0ea5e9", logo_url: "" });
  const [savingBrand, setSavingBrand] = useState(false);

  // Load system theme
  useEffect(() => {
    (async () => {
      try {
        const rows = await base44.entities.AppConfig.filter({ config_key: SYSTEM_THEME_KEY });
        const v = rows?.[0]?.config_value;
        if (v) setBrand((b) => ({ ...b, ...v }));
      } catch {/* none yet */}
    })();
  }, []);

  const saveBrand = async () => {
    setSavingBrand(true);
    try {
      const existing = await base44.entities.AppConfig.filter({ config_key: SYSTEM_THEME_KEY });
      const row = existing?.[0];
      if (row?.id) await base44.entities.AppConfig.update(row.id, { config_value: brand });else
      await base44.entities.AppConfig.create({ config_key: SYSTEM_THEME_KEY, config_value: brand });
      applyThemeColors(brand.primary_color, brand.accent_color);
      toast({ title: "Platform branding updated", description: "Colors apply across clubrudder.com." });
// (domain name unchanged)
    } catch (err) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    } finally {
      setSavingBrand(false);
    }
  };

  const startEdit = (plan) => {
    setEditing({
      id: plan.id,
      name: plan.name,
      tier: plan.tier,
      price_monthly: plan.price_monthly,
      price_annually: plan.price_annually,
      max_players: plan.max_players,
      max_branches: plan.max_branches,
      max_teams: plan.max_teams,
      modules: plan.modules || [],
      features: (plan.features || []).join("\n")
    });
  };

  const toggleModule = (key) => {
    setEditing((e) => ({
      ...e,
      modules: e.modules.includes(key) ? e.modules.filter((m) => m !== key) : [...e.modules, key]
    }));
  };

  const save = async () => {
    try {
      await base44.entities.SubscriptionPlan.update(editing.id, {
        name: editing.name,
        price_monthly: Number(editing.price_monthly) || 0,
        price_annually: Number(editing.price_annually) || 0,
        max_players: Number(editing.max_players) || 0,
        max_branches: Number(editing.max_branches) || 0,
        max_teams: Number(editing.max_teams) || 0,
        modules: editing.modules,
        features: editing.features.split("\n").map((f) => f.trim()).filter(Boolean)
      });
      toast({ title: "Plan updated", description: editing.name });
      setEditing({});
      onReload();
    } catch (err) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Branding — system_owner only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />Platform Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">These colors and identity apply across every page on the Club Rudder system domain.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label className="text-xs">Brand Name</Label><Input value={brand.club_name} onChange={(e) => setBrand({ ...brand, club_name: e.target.value })} /></div>
            <div><Label className="text-xs">Tagline</Label><Input value={brand.club_tagline} onChange={(e) => setBrand({ ...brand, club_tagline: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.primary_color} onChange={(e) => setBrand({ ...brand, primary_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={brand.primary_color} onChange={(e) => setBrand({ ...brand, primary_color: e.target.value })} className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.accent_color} onChange={(e) => setBrand({ ...brand, accent_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={brand.accent_color} onChange={(e) => setBrand({ ...brand, accent_color: e.target.value })} className="flex-1" />
              </div>
            </div>
            <div className="md:col-span-2"><Label className="text-xs">Logo URL</Label><Input value={brand.logo_url} onChange={(e) => setBrand({ ...brand, logo_url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <Button onClick={saveBrand} disabled={savingBrand} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Save className="w-4 h-4 mr-1" />{savingBrand ? "Saving…" : "Save Branding"}</Button>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <Card>
        <CardHeader><CardTitle>Subscription Plans</CardTitle></CardHeader>
        <CardContent>
          {loading ?
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {plans.map((plan) =>
            <Card key={plan.id} className={editing.id === plan.id ? "border-primary ring-2 ring-primary/20" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="capitalize bg-primary/10 text-primary">{plan.tier}</Badge>
                      {plan.is_active ? <Badge className="bg-primary/5 text-primary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                    </div>
                    {editing.id === plan.id ?
                <div className="space-y-2.5">
                        <div><Label className="text-xs">Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-8" /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label className="text-xs">Monthly $</Label><Input type="number" value={editing.price_monthly} onChange={(e) => setEditing({ ...editing, price_monthly: e.target.value })} className="h-8" /></div>
                          <div><Label className="text-xs">Annual $</Label><Input type="number" value={editing.price_annually} onChange={(e) => setEditing({ ...editing, price_annually: e.target.value })} className="h-8" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><Label className="text-xs">Players</Label><Input type="number" value={editing.max_players} onChange={(e) => setEditing({ ...editing, max_players: e.target.value })} className="h-8" /></div>
                          <div><Label className="text-xs">Branches</Label><Input type="number" value={editing.max_branches} onChange={(e) => setEditing({ ...editing, max_branches: e.target.value })} className="h-8" /></div>
                          <div><Label className="text-xs">Teams</Label><Input type="number" value={editing.max_teams} onChange={(e) => setEditing({ ...editing, max_teams: e.target.value })} className="h-8" /></div>
                        </div>
                        <div>
                          <Label className="text-xs">Included Modules</Label>
                          <div className="grid grid-cols-2 gap-1.5 mt-1">
                            {PLATFORM_MODULES.map((m) =>
                      <label key={m.key} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1.5 cursor-pointer hover:bg-slate-50">
                                <input type="checkbox" checked={editing.modules.includes(m.key)} onChange={() => toggleModule(m.key)} className="accent-primary" />
                                <span>{m.label}</span>
                              </label>
                      )}
                          </div>
                        </div>
                        <div><Label className="text-xs">Features (one per line)</Label><textarea value={editing.features} onChange={(e) => setEditing({ ...editing, features: e.target.value })} rows={3} className="w-full text-sm border rounded-md p-2" /></div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={save} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Save className="w-3 h-3 mr-1" />Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing({})}>Cancel</Button>
                        </div>
                      </div> :

                <>
                        <h3 className="font-bold text-lg">{plan.name}</h3>
                        <p className="text-2xl font-extrabold text-primary">${plan.price_monthly}<span className="text-sm font-normal text-slate-400">/mo</span></p>
                        <div className="text-xs text-slate-500">
                          Players: <b>{plan.max_players ?? "∞"}</b> · Branches: <b>{plan.max_branches ?? "∞"}</b> · Teams: <b>{plan.max_teams ?? "∞"}</b>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(plan.modules || []).map((m) => {
                      const mod = PLATFORM_MODULES.find((x) => x.key === m);
                      return <Badge key={m} variant="outline" className="text-xs">{mod?.label || m}</Badge>;
                    })}
                          {!plan.modules?.length && <span className="text-xs text-slate-400">No modules selected</span>}
                        </div>
                        <Button size="sm" variant="outline" className="w-full" onClick={() => startEdit(plan)}>Edit Plan</Button>
                      </>
                }
                  </CardContent>
                </Card>
            )}
            </div>
          }
        </CardContent>
      </Card>
    </div>);

}