import React, { useEffect, useState } from "react";
import { useNavigate } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2, Users, Shield, UserPlus, Calendar, MessageSquare } from "lucide-react";

/** Stage C workspace: season readiness, team matrix summary, orphan lists, and the season gate. */
export default function StageCPanel({ clubId, journey, canEdit, onSaved }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await base44.functions.invoke("journey-action", { action: "sync_season" });
      setData(res);
      onSaved?.(res);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activate = async () => {
    setActivating(true);
    setError("");
    try {
      const { data: res } = await base44.functions.invoke("journey-action", {
        action: "activate_season",
        name: clubId && journey?.club_name ? undefined : undefined,
      });
      onSaved?.(res);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setActivating(false);
    }
  };

  if (loading) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (error && !data) return <p className="text-sm text-destructive py-2">{error}</p>;

  const r = data?.readiness || {};
  const seasonActive = r.season?.status === "active";

  return (
    <div className="mt-2 p-4 rounded-xl border border-border bg-muted/30 space-y-4">
      {/* Season status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">{r.season ? `Season: ${r.season.name}` : "No active season yet"}</div>
            <div className="text-xs text-muted-foreground">{seasonActive ? "Active" : "Create and activate your current season to continue"}</div>
          </div>
        </div>
        {canEdit && !seasonActive && (
          <Button size="sm" onClick={activate} disabled={activating || !r.can_activate} className="gap-2">
            {activating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {r.can_activate ? "Create & activate season" : "Resolve issues first"}
          </Button>
        )}
        {seasonActive && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Readiness summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Teams" value={r.team_count || 0} icon={Users} ok={r.team_count > 0} />
        <Stat label="Platforms" value={r.platform_count || 0} icon={Shield} ok={r.platform_count > 0} />
        <Stat label="No platform" value={r.teams_without_platform?.length || 0} icon={AlertTriangle} ok={r.teams_without_platform?.length === 0} />
        <Stat label="Players unassigned" value={r.players_without_team || 0} icon={AlertTriangle} ok={r.players_without_team === 0} />
      </div>

      {/* Orphan lists with quick fixes */}
      {r.teams_without_platform?.length > 0 && (
        <OrphanList title="Teams without a platform" items={r.teams_without_platform} onFix={() => navigate("/Registration?tab=teams")} fixLabel="Assign platforms" />
      )}
      {r.teams_without_coach?.length > 0 && (
        <OrphanList title="Teams without a coach" items={r.teams_without_coach} onFix={() => navigate("/ClubStaff")} fixLabel="Assign coaches" />
      )}
      {r.players_without_team > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <div className="text-sm"><strong>{r.players_without_team}</strong> player(s) without a team</div>
          <Button size="sm" variant="outline" onClick={() => navigate("/Registration?tab=players")}>Assign players</Button>
        </div>
      )}

      {/* Season gate */}
      {!seasonActive && r.team_count > 0 && !r.can_activate && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          <strong>Season gate:</strong> Every team needs a platform and every player needs a team before the season can go Active.
          Fix the items above, then activate.
        </div>
      )}
      {!seasonActive && r.can_activate && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> All checks passed. Activate the season to create team chat and announcement spaces automatically.
        </div>
      )}
      {seasonActive && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="w-4 h-4" /> Team chat and announcement spaces were created for every team.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, ok }) {
  return (
    <div className={`p-2.5 rounded-lg border text-center ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${ok ? "text-emerald-500" : "text-amber-500"}`} />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function OrphanList({ title, items, onFix, fixLabel }) {
  return (
    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-amber-800">{title} ({items.length})</div>
        <Button size="sm" variant="outline" onClick={onFix}>{fixLabel}</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 8).map((t) => (
          <span key={t.id} className="text-xs px-2 py-1 rounded bg-white border border-amber-200">{t.name}</span>
        ))}
        {items.length > 8 && <span className="text-xs text-muted-foreground">+{items.length - 8} more</span>}
      </div>
    </div>
  );
}