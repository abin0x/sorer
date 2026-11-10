import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { DEFAULT_PRICING_CONFIG } from "@/lib/pricingCalculator";

export default function PricingConfigPanel() {
  const [configId, setConfigId] = useState(null);
  const [config, setConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.PricingConfig.list().then((rows) => {
      if (rows?.[0]) {
        setConfigId(rows[0].id);
        setConfig({
          tiers: rows[0].tiers?.length ? rows[0].tiers : DEFAULT_PRICING_CONFIG.tiers,
          modules: rows[0].modules?.length ? rows[0].modules : DEFAULT_PRICING_CONFIG.modules,
          volume_multipliers: rows[0].volume_multipliers?.length ? rows[0].volume_multipliers : DEFAULT_PRICING_CONFIG.volume_multipliers,
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateTier = (idx, field, value) => {
    const tiers = config.tiers.map((t, i) => (i === idx ? { ...t, [field]: value } : t));
    setConfig({ ...config, tiers });
  };

  const updateModule = (idx, field, value) => {
    const modules = config.modules.map((m, i) => (i === idx ? { ...m, [field]: value } : m));
    setConfig({ ...config, modules });
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        tiers: config.tiers.map((t) => ({ ...t, setup_fee: Number(t.setup_fee) || 0, per_player_cost: Number(t.per_player_cost) || 0, module_discount_percent: Number(t.module_discount_percent) || 0 })),
        modules: config.modules.map((m) => ({ ...m, list_price: Number(m.list_price) || 0 })),
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
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Calculator Configuration</CardTitle>
        <p className="text-sm text-slate-500">Edit the tier rates and module prices used by the public /pricing calculator.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold text-sm mb-3">Tiers</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b">
                  <th className="py-2 font-semibold">Tier</th>
                  <th className="py-2 font-semibold">Setup Fee ($/branch)</th>
                  <th className="py-2 font-semibold">Per Player ($/yr)</th>
                  <th className="py-2 font-semibold">Module Discount (%)</th>
                </tr>
              </thead>
              <tbody>
                {config.tiers.map((t, i) => (
                  <tr key={t.key} className="border-b">
                    <td className="py-2 font-semibold">{t.name}</td>
                    <td className="py-2"><Input type="number" value={t.setup_fee} onChange={(e) => updateTier(i, "setup_fee", e.target.value)} className="w-28" /></td>
                    <td className="py-2"><Input type="number" step="0.01" value={t.per_player_cost} onChange={(e) => updateTier(i, "per_player_cost", e.target.value)} className="w-28" /></td>
                    <td className="py-2"><Input type="number" value={t.module_discount_percent} onChange={(e) => updateTier(i, "module_discount_percent", e.target.value)} className="w-24" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Add-On Modules</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b">
                  <th className="py-2 font-semibold">Module</th>
                  <th className="py-2 font-semibold">List Price ($/yr)</th>
                </tr>
              </thead>
              <tbody>
                {config.modules.map((m, i) => (
                  <tr key={m.key} className="border-b">
                    <td className="py-2 font-semibold">{m.name}</td>
                    <td className="py-2"><Input type="number" value={m.list_price} onChange={(e) => updateModule(i, "list_price", e.target.value)} className="w-28" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving} className="gap-2 text-[hsl(var(--primary-foreground))]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Configuration
          </Button>
          {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
        </div>
      </CardContent>
    </Card>
  );
}