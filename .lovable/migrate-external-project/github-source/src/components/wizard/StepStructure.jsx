import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import { PLATFORM_LIST } from "@/lib/tourDefaults";

// Branches = Location entities, Platforms/Leagues = Platform entities linked by location_id.
export default function StepStructure({ club, onSaved, onBack }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]); // [{ id?, name, platforms: [{ id?, name }] }]
  const [customInput, setCustomInput] = useState({}); // { [branchIndex]: string }

  useEffect(() => {
    (async () => {
      try {
        const [locations, platforms] = await Promise.all([
          base44.entities.Location.filter({ club_id: club.id }),
          base44.entities.Platform.filter({ club_id: club.id }),
        ]);
        if (locations.length === 0) {
          setBranches([{ name: "", platforms: [] }]);
        } else {
          setBranches(locations.map((l) => ({
            id: l.id,
            name: l.name,
            platforms: platforms.filter((p) => p.location_id === l.id).map((p) => ({ id: p.id, name: p.name })),
          })));
        }
      } catch (e) {
        setBranches([{ name: "", platforms: [] }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [club.id]);

  const setBranchName = (i, name) => setBranches((b) => b.map((br, idx) => idx === i ? { ...br, name } : br));

  const togglePlatform = (bi, pname) => setBranches((b) => b.map((br, idx) => {
    if (idx !== bi) return br;
    const exists = br.platforms.find((p) => p.name === pname);
    return {
      ...br,
      platforms: exists
        ? br.platforms.filter((p) => p.name !== pname)
        : [...br.platforms, { name: pname }],
    };
  }));

  const addCustomPlatform = (bi) => {
    const name = (customInput[bi] || "").trim();
    if (!name) return;
    setBranches((b) => b.map((br, idx) => idx === bi && !br.platforms.find((p) => p.name === name) ? { ...br, platforms: [...br.platforms, { name }] } : br));
    setCustomInput((c) => ({ ...c, [bi]: "" }));
  };

  const removePlatform = (bi, pi) => setBranches((b) => b.map((br, idx) => idx === bi ? { ...br, platforms: br.platforms.filter((_, j) => j !== pi) } : br));

  const addBranch = () => setBranches((b) => [...b, { name: "", platforms: [] }]);
  const removeBranch = (i) => setBranches((b) => b.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      for (const branch of branches) {
        const name = branch.name.trim();
        if (!name) continue;
        const loc = branch.id
          ? await base44.entities.Location.update(branch.id, { name })
          : await base44.entities.Location.create({ club_id: club.id, name });

        for (const platform of branch.platforms) {
          const pname = platform.name.trim();
          if (!pname) continue;
          if (platform.id) {
            await base44.entities.Platform.update(platform.id, { name: pname });
          } else {
            await base44.entities.Platform.create({ club_id: club.id, location_id: loc.id, location_name: loc.name, name: pname });
          }
        }
      }
      onSaved();
    } catch (err) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Step 2 of 4 — Branches & Platforms</h2>
        <p className="text-sm text-slate-500">This defines the access boundaries for everything that follows in Beacon and reporting.</p>
      </div>

      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
        {branches.map((branch, bi) => (
          <div key={bi} className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input value={branch.name} onChange={(e) => setBranchName(bi, e.target.value)} placeholder={`Branch ${bi + 1} name`} className="font-semibold" />
              {branches.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeBranch(bi)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Platforms / Leagues</Label>
              <p className="text-xs text-slate-400 mb-2">Tap all that apply at this branch.</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_LIST.map((pname) => {
                  const selected = !!branch.platforms.find((p) => p.name === pname);
                  return (
                    <button
                      key={pname}
                      type="button"
                      onClick={() => togglePlatform(bi, pname)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-all ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                      {pname}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom platforms */}
            <div className="pl-4 space-y-1.5 border-l-2 border-slate-100">
              {branch.platforms
                .map((p, pi) => ({ p, pi }))
                .filter(({ p }) => p.name && !PLATFORM_LIST.includes(p.name))
                .map(({ p, pi }) => (
                  <div key={pi} className="flex items-center gap-2">
                    <Label className="text-xs text-slate-400 w-24 shrink-0">Custom</Label>
                    <Input value={p.name} readOnly className="h-8 bg-slate-50" />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePlatform(bi, pi)}><Trash2 className="w-3.5 h-3.5 text-rose-400" /></Button>
                  </div>
                ))}
              <div className="flex items-center gap-2">
                <Input
                  value={customInput[bi] || ""}
                  onChange={(e) => setCustomInput((c) => ({ ...c, [bi]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomPlatform(bi))}
                  placeholder="Add a custom platform…"
                  className="h-8"
                />
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => addCustomPlatform(bi)}><Plus className="w-3.5 h-3.5" /> Add</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={addBranch}><Plus className="w-4 h-4" /> Add Another Branch</Button>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save & Continue
        </Button>
      </div>
    </div>
  );
}