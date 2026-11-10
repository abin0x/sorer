import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Wand2 } from "lucide-react";

export default function SchedulingWizard({ tournament, fields, registrations, teams, referees, onGenerated }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Team selection
  const [selectedTeams, setSelectedTeams] = useState([]);

  // Schedule params
  const [dates, setDates] = useState([]);
  const [startTime, setStartTime] = useState("8:00 AM");
  const [gameDuration, setGameDuration] = useState(80);
  const [gap, setGap] = useState(20);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedReferees, setSelectedReferees] = useState([]);
  const [scheduleByDivision, setScheduleByDivision] = useState(false);
  const [coachAware, setCoachAware] = useState(true);
  const [parkingMin, setParkingMin] = useState(10);

  useEffect(() => {
    if (open) {
      // Pre-select all approved registrations + all in-house teams
      const approved = registrations.filter((r) => r.status === "approved");
      setSelectedTeams(approved.map((r) => r.id));
      setSelectedFields(fields.map((f) => f.id));
      // Default dates: tournament start date
      if (tournament?.start_date) setDates([tournament.start_date]);
      // Auto-enable division scheduling if any approved team has a division
      const hasDivisions = approved.some((r) => r.division);
      setScheduleByDivision(hasDivisions);
    }
  }, [open]);

  const toggleTeam = (id) => {
    setSelectedTeams((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };
  const toggleField = (id) => {
    setSelectedFields((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };
  const toggleReferee = (id) => {
    setSelectedReferees((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const fieldObjs = fields
        .filter((f) => selectedFields.includes(f.id))
        .map((f) => ({ field_id: f.id, field_name: f.name, facility_name: f.facility_name || "" }));
      const refObjs = referees
        .filter((r) => selectedReferees.includes(r.id))
        .map((r) => ({ referee_id: r.id, referee_name: `${r.first_name} ${r.last_name}` }));

      // Build division map from registrations (for division-based scheduling)
      const teamDivisions = {};
      for (const r of registrations) {
        if (selectedTeams.includes(r.id) && r.division) {
          teamDivisions[r.id] = r.division;
        }
      }

      const res = await base44.functions.invoke("generate-tournament-schedule", {
        tournament_id: tournament.id,
        team_ids: selectedTeams,
        fields: fieldObjs,
        dates,
        start_time: startTime,
        game_duration_min: Number(gameDuration),
        gap_min: Number(gap),
        referees: refObjs,
        schedule_by_division: scheduleByDivision,
        team_divisions: teamDivisions,
        coach_aware: coachAware,
        parking_min: Number(parkingMin),
      });
      setResult(res.data);
      if (res.data.conflict_count === 0) {
        setTimeout(() => {
          onGenerated();
          setOpen(false);
          setStep(1);
          setResult(null);
        }, 1500);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to generate schedule");
    } finally {
      setGenerating(false);
    }
  };

  const teamLabel = (id) => {
    const reg = registrations.find((r) => r.id === id);
    if (reg) return { name: reg.team_name, type: "external" };
    const team = teams.find((t) => t.id === id);
    if (team) return { name: team.name, type: "internal" };
    return { name: id, type: "unknown" };
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Wand2 className="w-4 h-4" /> Scheduling Wizard
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Auto-Generate Schedule — {tournament?.name}</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Select teams */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">1. Select Teams ({selectedTeams.length})</Label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleByDivision}
                    onChange={(e) => setScheduleByDivision(e.target.checked)}
                    className="rounded"
                  />
                  <span>By Division</span>
                </label>
                <Button size="sm" variant="ghost" onClick={() => setSelectedTeams(registrations.filter((r) => r.status === "approved").map((r) => r.id))}>
                  Select all approved
                </Button>
              </div>
            </div>
            {scheduleByDivision && (
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                Teams will be grouped by division — each division plays its own round-robin.
              </div>
            )}
            <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
              {registrations.filter((r) => r.status === "approved").map((r) => (
                <label key={r.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedTeams.includes(r.id)} onChange={() => toggleTeam(r.id)} className="rounded" />
                  <span className="flex-1 text-sm">{r.team_name}</span>
                  {r.division && <Badge variant="outline" className="text-xs">{r.division}</Badge>}
                  <Badge variant="outline" className="text-xs">External</Badge>
                </label>
              ))}
              {teams.map((t) => (
                <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedTeams.includes(t.id)} onChange={() => toggleTeam(t.id)} className="rounded" />
                  <span className="flex-1 text-sm">{t.name}</span>
                  <Badge variant="secondary" className="text-xs">In-house</Badge>
                </label>
              ))}
              {registrations.length === 0 && teams.length === 0 && (
                <p className="p-3 text-sm text-slate-400 text-center">No teams available. Approve registrations first.</p>
              )}
            </div>
          </div>

          {/* Step 2: Fields & dates */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">2. Fields & Dates</Label>
            <div>
              <p className="text-sm text-slate-500 mb-1">Available Fields</p>
              <div className="flex flex-wrap gap-2">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleField(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition ${selectedFields.includes(f.id) ? "bg-primary text-primary-foreground border-primary" : "bg-white border-slate-200 hover:border-primary"}`}
                  >
                    {f.name}
                  </button>
                ))}
                {fields.length === 0 && <p className="text-sm text-slate-400">No fields set up. Add fields in Facilities first.</p>}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Tournament Dates</p>
              <div className="flex flex-wrap gap-2 items-center">
                {dates.map((d, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input type="date" value={d} onChange={(e) => setDates(dates.map((x, j) => (j === i ? e.target.value : x)))} className="w-40" />
                    <Button size="sm" variant="ghost" onClick={() => setDates(dates.filter((_, j) => j !== i))}>×</Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setDates([...dates, ""])}>+ Add date</Button>
              </div>
            </div>
          </div>

          {/* Step 3: Time settings */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">3. Time Settings</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="start">First Kickoff</Label>
                <Input id="start" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="8:00 AM" />
              </div>
              <div>
                <Label htmlFor="dur">Game (min)</Label>
                <Input id="dur" type="number" value={gameDuration} onChange={(e) => setGameDuration(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="gap">Gap (min)</Label>
                <Input id="gap" type="number" value={gap} onChange={(e) => setGap(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Coach & Travel Optimization */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Coach & Travel Optimization</Label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={coachAware}
                onChange={(e) => setCoachAware(e.target.checked)}
                className="rounded"
              />
              <span>Coach-aware scheduling — same/adjacent fields for coaches with multiple teams, with travel time between facilities</span>
            </label>
            {coachAware && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="parking">Parking buffer (min)</Label>
                  <Input id="parking" type="number" value={parkingMin} onChange={(e) => setParkingMin(e.target.value)} />
                </div>
                <div className="flex items-end text-xs text-slate-500 pb-2">
                  Travel time between facilities is computed via Google Maps. Add a Google Maps API key in Secrets for precise directions.
                </div>
              </div>
            )}
          </div>

          {/* Step 4: Referees (optional) */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">4. Referees (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {referees.map((r) => (
                <button
                  key={r.id}
                  onClick={() => toggleReferee(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition ${selectedReferees.includes(r.id) ? "bg-primary text-primary-foreground border-primary" : "bg-white border-slate-200 hover:border-primary"}`}
                >
                  {r.first_name} {r.last_name}
                </button>
              ))}
              {referees.length === 0 && <p className="text-sm text-slate-400">No referees added yet.</p>}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border ${result.conflict_count === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.conflict_count === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
                <span className="font-medium">
                  {result.games_created} games created across {result.rounds} rounds
                  {result.conflict_count > 0 && ` · ${result.conflict_count} conflict(s) detected`}
                </span>
              </div>
              {result.conflicts?.length > 0 && (
                <ul className="text-sm text-slate-600 space-y-1 ml-7">
                  {result.conflicts.slice(0, 5).map((c, i) => (
                    <li key={i}>• {c.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || selectedTeams.length < 2 || selectedFields.length === 0 || dates.filter(Boolean).length === 0}
            >
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4 mr-2" />Generate Schedule</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}