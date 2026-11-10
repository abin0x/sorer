import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, ArrowRight, ArrowLeft, LockIcon } from "lucide-react";
import { DAY_LABELS, minToLabel } from "@/lib/trainingSchedulerConfig";

export default function StepEditLock({ activeScenario, onUpdateScenario, onPrev, onNext }) {
  const [sessions, setSessions] = useState(activeScenario?.sessions || []);
  const [saving, setSaving] = useState(false);

  // Group sessions by day for a grid view
  const byDay = useMemo(() => {
    const map = {};
    DAY_LABELS.forEach((d) => { map[d] = []; });
    sessions.forEach((s) => { if (map[s.day]) map[s.day].push(s); });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.start_min - b.start_min));
    return map;
  }, [sessions]);

  const toggleLock = (key) => {
    setSessions((prev) => prev.map((s) => (s.key === key ? { ...s, locked: !s.locked } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const lockedKeys = sessions.filter((s) => s.locked).map((s) => s.key);
      const updated = await base44.entities.ScheduleScenario.update(activeScenario.id, {
        sessions,
        locked_session_keys: lockedKeys,
      });
      onUpdateScenario(updated);
    } finally {
      setSaving(false);
    }
  };

  if (!activeScenario) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockIcon className="w-5 h-5 text-primary" /> Edit & Lock Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Review the schedule on the field board below. Lock any session to keep it fixed when you re-run the generator.
            Locked sessions stay in place; unlocked sessions may move on the next generation pass.
          </p>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
            <Lock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">{sessions.filter((s) => s.locked).length} sessions locked</span>
          </div>
        </CardContent>
      </Card>

      {/* Day-by-day grid view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {DAY_LABELS.filter((d) => byDay[d]?.length > 0).map((day) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {byDay[day].map((s) => (
                <div
                  key={s.key}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${s.locked ? "border-blue-300 bg-blue-50/50" : "border-border"}`}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => toggleLock(s.key)}
                  >
                    {s.locked ? <Lock className="w-3.5 h-3.5 text-blue-600" /> : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.team_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.start_time}–{s.end_time} · {s.field_name} · <span className="font-mono">{s.grid_label}</span>
                    </p>
                  </div>
                  {s.locked && <Badge className="bg-blue-100 text-blue-700 text-xs">Locked</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}><ArrowLeft className="w-4 h-4" /> Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>Save Locks</Button>
          <Button onClick={onNext}>Continue to Publish <ArrowRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}