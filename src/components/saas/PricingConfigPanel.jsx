import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CheckCircle2, Plus, X, RotateCcw, AlertCircle } from "lucide-react";
import { DEFAULT_PRICING_CONFIG, normalizePricingConfig, calculatePricing, setupFeeFor } from "@/lib/pricingCalculator";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function PricingConfigPanel() {
  const [configId, setConfigId] = useState(null);
  const [config, setConfig] = useState(() => normalizePricingConfig(DEFAULT_PRICING_CONFIG));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newFeature, setNewFeature] = useState({});

  useEffect(() => {
    base44.entities.PricingConfig.list().then((rows) => {
      if (rows?.[0]) {
        setConfigId(rows[0].id);
        setConfig(normalizePricingConfig(rows[0]));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (field, value) => setConfig((c) => ({ ...c, [field]: value }));
  const updateTier = (idx, field, value) => setConfig((c) => ({ ...c, tiers: c.tiers.map((t, i) => (i === idx ? { ...t, [field]: value } : t)) }));
  const updateModule = (idx, field, value) => setConfig((c) => ({ ...c, modules: c.modules.map((m, i) => (i === idx ? { ...m, [field]: value } : m)) }));

  const addFeature = (idx) => {
    const text = (newFeature[idx] || "").trim();
    if (!text) return;
    updateTier(idx, "features", [...(config.tiers[idx].features || []), text]);
    setNewFeature((s) => ({ ...s, [idx]: "" }));
  };
  const editFeature = (idx, fi, value) => updateTier(idx, "features", config.tiers[idx].features.map((f, j) => (j === fi ? value : f)));
  const removeFeature = (idx, fi) => updateTier(idx, "features", config.tiers[idx].features.filter((_, j) => j !== fi));
  const moveFeature = (idx, fi, dir) => {
    const list = [...config.tiers[idx].features];
    const to = fi + dir;
    if (to < 0 || to >= list.length) return;
    [list[fi], list[to]] = [list[to], list[fi]];
    updateTier(idx, "features", list);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const n = (v) => Number(v) || 0;
      const payload = {
        base_license_fee: n(config.base_license_fee),
        base_players_included: Math.round(n(config.base_players_included)),
        setup_fee_first_branch: n(config.setup_fee_first_branch),
        setup_fee_additional_branch: n(config.setup_fee_additional_branch),
        founding_club_total: Math.max(0, Math.round(n(config.founding_club_total))),
        tiers: config.tiers.map((t) => ({
          ...t,
          per_player_cost: n(t.per_player_cost),
          module_discount_percent: n(t.module_discount_percent),
          features: (t.features || []).map((f) => f.trim()).filter(Boolean),
        })),
        modules: config.modules.map((m) => ({ ...m, list_price: n(m.list_price) })),
        volume_multipliers: config.volume_multipliers,
      };
      if (configId) {
        await base44.entities.PricingConfig.update(configId, payload);
      } else {
        const created = await base44.entities.PricingConfig.create(payload);
        setConfigId(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e?.message || "Could not save pricing. Only the app owner can change it.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const example = calculatePricing(config, { branches: 2, players: 600, tierKey: config.tiers[1]?.key });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
        <p className="text-sm text-muted-foreground">Everything here appears on the public pricing page and calculator as soon as you save.</p>
      </CardHeader>
      <CardContent className="space-y-8">
        <section>
          <h4 className="font-semibold text-sm mb-3">Base license &amp; onboarding</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Field label="Base license ($/yr)"><Input type="number" value={config.base_license_fee} onChange={(e) => set("base_license_fee", e.target.value)} /></Field>
            <Field label="Players included"><Input type="number" value={config.base_players_included} onChange={(e) => set("base_players_included", e.target.value)} /></Field>
            <Field label="Onboarding fee, club ($)"><Input type="number" value={config.setup_fee_first_branch} onChange={(e) => set("setup_fee_first_branch", e.target.value)} /></Field>
            <Field label="Each additional branch ($)"><Input type="number" value={config.setup_fee_additional_branch} onChange={(e) => set("setup_fee_additional_branch", e.target.value)} /></Field>
            <Field label="Founding clubs" hint="Onboarding fee waived for this many live clubs."><Input type="number" min={0} value={config.founding_club_total} onChange={(e) => set("founding_club_total", e.target.value)} /></Field>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Example: 2 branches, 600 players on {config.tiers[1]?.name} — {money(example.ongoingAnnual)}/yr, plus {money(setupFeeFor(config, 2))} one-time onboarding (waived for founding clubs).
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-sm mb-3">Tier cards</h4>
          <div className="grid lg:grid-cols-3 gap-4">
            {config.tiers.map((t, i) => (
              <div key={t.key} className="rounded-xl border bg-card p-4 space-y-3">
                <Field label="Card name"><Input value={t.name} onChange={(e) => updateTier(i, "name", e.target.value)} /></Field>
                <Field label="Who it's for"><Input value={t.best_for} onChange={(e) => updateTier(i, "best_for", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="$ per extra player/yr"><Input type="number" step="0.01" value={t.per_player_cost} onChange={(e) => updateTier(i, "per_player_cost", e.target.value)} /></Field>
                  <Field label="Module discount %"><Input type="number" value={t.module_discount_percent} onChange={(e) => updateTier(i, "module_discount_percent", e.target.value)} /></Field>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Card features</Label>
                  {(t.features || []).map((f, fi) => (
                    <div key={fi} className="flex items-center gap-1">
                      <Input value={f} onChange={(e) => editFeature(i, fi, e.target.value)} className="h-8 text-xs" />
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-7 shrink-0" onClick={() => moveFeature(i, fi, -1)} aria-label="Move up">↑</Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-7 shrink-0" onClick={() => moveFeature(i, fi, 1)} aria-label="Move down">↓</Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-7 shrink-0" onClick={() => removeFeature(i, fi)} aria-label="Remove feature"><X className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input placeholder="Add a feature" value={newFeature[i] || ""} onChange={(e) => setNewFeature((s) => ({ ...s, [i]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature(i))} className="h-8 text-xs" />
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => addFeature(i)} aria-label="Add feature"><Plus className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="font-semibold text-sm mb-3">Add-on modules</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {config.modules.map((m, i) => (
              <div key={m.key} className="rounded-xl border bg-card p-3 space-y-2">
                <div className="grid grid-cols-[1fr_7rem] gap-2">
                  <Field label="Name"><Input value={m.name} onChange={(e) => updateModule(i, "name", e.target.value)} /></Field>
                  <Field label="$ / yr"><Input type="number" value={m.list_price} onChange={(e) => updateModule(i, "list_price", e.target.value)} /></Field>
                </div>
                <Field label="Description"><Textarea rows={2} value={m.notes || ""} onChange={(e) => updateModule(i, "notes", e.target.value)} className="text-xs" /></Field>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save pricing
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => setConfig(normalizePricingConfig(DEFAULT_PRICING_CONFIG))}>
            <RotateCcw className="w-4 h-4" /> Reset to defaults
          </Button>
          {saved && <span className="flex items-center gap-1 text-sm text-primary"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
          {error && <span className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="w-4 h-4" /> {error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
