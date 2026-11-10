import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, Building2 } from "lucide-react";
import useLifecycleContext from "./useLifecycleContext";

const OPTIONS = [
  { id: "club", icon: Building2, title: "Whole club", desc: "I manage the season lifecycle for every branch." },
  { id: "branches", icon: Users, title: "Selected branches", desc: "I manage only the branches I pick. Branch Directors and Branch Admins own the rest." },
];

/** Club Admin chooses which branches they run; the rest are delegated to branch leads. */
export default function LifecycleScopeCard({ canEdit = true }) {
  const { season, locations } = useLifecycleContext();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("club");
  const [ids, setIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMode(season?.lifecycle_scope === "branches" ? "branches" : "club");
    setIds(season?.admin_branch_ids || []);
  }, [season?.id, season?.lifecycle_scope, season?.admin_branch_ids]);

  const toggle = (id) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const dirty = mode !== (season?.lifecycle_scope === "branches" ? "branches" : "club")
    || (mode === "branches" && JSON.stringify([...ids].sort()) !== JSON.stringify([...(season?.admin_branch_ids || [])].sort()));

  const save = async () => {
    setSaving(true);
    await base44.entities.Season.update(season.id, {
      lifecycle_scope: mode,
      admin_branch_ids: mode === "branches" ? ids : [],
    });
    await queryClient.invalidateQueries({ queryKey: ["cycle-seasons"] });
    setSaving(false);
  };

  return (
    <Card className="border-border-subtle rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold tracking-wide flex items-center gap-2">
          Lifecycle Ownership
          {season && <Badge variant="outline" className="text-[10px]">{season.name}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {!season ? (
          <p className="text-sm text-text-secondary">Create a season first, then choose which branches you manage.</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {OPTIONS.map((o) => (
                <button key={o.id} type="button" disabled={!canEdit} onClick={() => setMode(o.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${mode === o.id ? "border-action bg-action/5" : "border-border-subtle hover:border-action/40"}`}>
                  <div className="flex items-center gap-2 font-semibold text-sm"><o.icon className="w-4 h-4 text-action" />{o.title}</div>
                  <p className="text-xs text-text-secondary mt-1">{o.desc}</p>
                </button>
              ))}
            </div>
            {mode === "branches" && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {locations.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 p-2 rounded-lg border border-border-subtle text-sm cursor-pointer">
                    <Checkbox checked={ids.includes(l.id)} disabled={!canEdit} onCheckedChange={() => toggle(l.id)} />
                    {l.name}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-text-secondary">
              Club Admin and Club Director always see every branch. Branches outside your scope are run by their Branch Director / Branch Admin.
            </p>
            {canEdit && (
              <Button size="sm" onClick={save} disabled={!dirty || saving}>
                {saving ? "Saving..." : "Save ownership"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}