import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BODIES } from "@/lib/compliance";
import GotSportSyncCard from "@/components/compliance/GotSportSyncCard";

export default function SettingsTab({ data }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(data.settings?.governing_bodies || []);
  const [ankored, setAnkored] = useState(data.settings?.ankored_url || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const toggle = (k) => setSelected((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await base44.functions.invoke("compliance", { action: "save_settings", governing_bodies: selected, ankored_url: ankored });
      qc.invalidateQueries({ queryKey: ["adminCompliance"] });
      setMsg("Saved. Coach requirements have been generated.");
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message);
    }
    setBusy(false);
  };

  return (
    <Card><CardContent className="p-6 space-y-5">
      <div>
        <h3 className="font-semibold">Governing Body Affiliations</h3>
        <p className="text-sm text-slate-500">Select every body your club is affiliated with. Expiration dates follow the strictest rule so one certificate satisfies all of them.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {BODIES.map((b) => (
          <label key={b.key} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={selected.includes(b.key)} onCheckedChange={() => toggle(b.key)} />{b.label}
          </label>
        ))}
      </div>
      {selected.includes("mls_next") && (
        <div>
          <Label htmlFor="ankored">Ankored compliance portal link (MLS Next)</Label>
          <Input id="ankored" type="url" placeholder="https://" value={ankored} onChange={(e) => setAnkored(e.target.value)} />
          <p className="text-xs text-slate-500 mt-1">MLS Next uses Ankored. Coaches complete SafeSport there and upload the certificate here.</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}Save affiliations</Button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
      {selected.includes("gotsports") && <GotSportSyncCard />}
    </CardContent></Card>
  );
}