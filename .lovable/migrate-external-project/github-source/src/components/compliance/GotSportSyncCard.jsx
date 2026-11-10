import React, { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GotSportSyncCard() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");

  const sync = async () => {
    setBusy(true); setResult(""); setErr("");
    try {
      const { data } = await base44.functions.invoke("compliance-gotsport-sync", {});
      if (data.skipped) setResult(data.reason);
      else setResult(`Checked ${data.coaches} coaches. ${data.verified} verified, ${data.unchanged} need attention.${data.note ? " " + data.note : ""}`);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
    setBusy(false);
  };

  return (
    <Card className="border-dashed"><CardContent className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5"><RefreshCw className="w-4 h-4" />GotSport "Check Records" sync</p>
          <p className="text-xs text-slate-500">Verifies coach compliance against your GotSport registry. Runs automatically each morning, or run it now.</p>
        </div>
        <Button variant="outline" size="sm" onClick={sync} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}Sync now</Button>
      </div>
      {result && <p className="text-sm text-slate-600">{result}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </CardContent></Card>
  );
}