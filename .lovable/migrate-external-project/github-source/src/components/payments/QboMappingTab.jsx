import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Shield, MapPin, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const UNMAPPED = "__unmapped__";

export default function QboMappingTab({ canManage }) {
  const qc = useQueryClient();
  const [savingKey, setSavingKey] = useState(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["qbo-mapping-lists"],
    queryFn: () => base44.functions.invoke("get-qbo-mapping-lists", {}).then((r) => r.data),
    retry: false,
  });

  const teams = data?.teams || [];
  const branches = data?.branches || [];
  const classes = data?.classes || [];
  const locations = data?.locations || [];

  const saveTeamClass = async (team, classId) => {
    setSavingKey(`team-${team.id}`);
    try {
      const cls = classes.find((c) => c.id === classId);
      await base44.entities.Team.update(team.id, {
        qbo_class_id: classId === UNMAPPED ? "" : classId,
        qbo_class_name: classId === UNMAPPED ? "" : cls?.name || "",
      });
      qc.invalidateQueries({ queryKey: ["qbo-mapping-lists"] });
      toast.success(`${team.name} mapped`);
    } catch (e) {
      toast.error("Could not save mapping: " + (e.message || "Unknown error"));
    }
    setSavingKey(null);
  };

  const saveBranchLocation = async (branch, locationId) => {
    setSavingKey(`branch-${branch.id}`);
    try {
      const loc = locations.find((l) => l.id === locationId);
      await base44.entities.Location.update(branch.id, {
        qbo_location_id: locationId === UNMAPPED ? "" : locationId,
        qbo_location_name: locationId === UNMAPPED ? "" : loc?.name || "",
      });
      qc.invalidateQueries({ queryKey: ["qbo-mapping-lists"] });
      toast.success(`${branch.name} mapped`);
    } catch (e) {
      toast.error("Could not save mapping: " + (e.message || "Unknown error"));
    }
    setSavingKey(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading QuickBooks mapping…
      </div>
    );
  }

  if (isError) {
    const msg = error?.response?.data?.error || error?.message || "";
    return (
      <Card className="adisal-card border-amber-200 bg-amber-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">Couldn't load QuickBooks mapping</p>
            <p className="text-xs text-amber-700 mt-1">{msg || "Connect QuickBooks first from the Connections page, then come back here to map teams and branches."}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Map every team to a QuickBooks Class and every branch to a QuickBooks Location. Stripe payments for an unmapped team or branch are blocked from syncing and the bookkeeper is alerted.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="rounded-xl shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="adisal-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm">Teams → QuickBooks Class</p>
          </div>
          <div className="space-y-2">
            {teams.length === 0 && <p className="text-xs text-muted-foreground">No teams yet.</p>}
            {teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-sm font-medium truncate flex-1">{team.name}</span>
                <Select
                  value={team.qbo_class_id || UNMAPPED}
                  onValueChange={(v) => saveTeamClass(team, v)}
                  disabled={!canManage || savingKey === `team-${team.id}`}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Not mapped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNMAPPED}>Not mapped</SelectItem>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="adisal-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm">Branches → QuickBooks Location</p>
          </div>
          <div className="space-y-2">
            {branches.length === 0 && <p className="text-xs text-muted-foreground">No branches yet.</p>}
            {branches.map((branch) => (
              <div key={branch.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-sm font-medium truncate flex-1">{branch.name}</span>
                <Select
                  value={branch.qbo_location_id || UNMAPPED}
                  onValueChange={(v) => saveBranchLocation(branch, v)}
                  disabled={!canManage || savingKey === `branch-${branch.id}`}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Not mapped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNMAPPED}>Not mapped</SelectItem>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}