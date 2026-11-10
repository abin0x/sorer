import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, format as formatDate } from "date-fns";
import { TRYOUT_LEAD_ROLES, currentSeason, nextSeason } from "@/lib/tryoutDefaults";
import { generateEventTasks, resolveStaffByRole } from "@/lib/tryoutAutomation";
import SearchableSelect from "@/components/tryout/SearchableSelect";
import MultiSelectDropdown from "@/components/communication/MultiSelectDropdown";
import PlanSetupFields from "@/components/tryout/PlanSetupFields";

/**
 * Creating a Tryout Plan and its Main Club Tryout Date is a single action —
 * a plan cannot exist without its anchor event, so this dialog collects both
 * the plan's scope and the main tryout's date/logistics, then creates the
 * TryoutPlan, the main_tryout TryoutEvent, and its task/subtasks together.
 */
const EMPTY_SETUP = {
  tryout_fee: "",
  registration_open_date: "",
  registration_close_date: "",
  max_capacity: "",
  required_documents: [],
};

export default function CreatePlanDialog({ segment, staff, branchScopeId, onClose, onCreated }) {
  const navigate = useNavigate();
  const [setup, setSetup] = useState(EMPTY_SETUP);
  const [title, setTitle] = useState("");
  const [season, setSeason] = useState(currentSeason());
  const [leadUserId, setLeadUserId] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState([]);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Main Club Tryout Date fields — required, this is the plan's anchor event
  const [mainDate, setMainDate] = useState("");
  const [mainStartTime, setMainStartTime] = useState("");
  const [mainEndTime, setMainEndTime] = useState("");
  const [mainLocation, setMainLocation] = useState("");
  const [expectedAttendance, setExpectedAttendance] = useState("");
  const [autoRegistration, setAutoRegistration] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: locations = [] } = useQuery({
    queryKey: ["locations-for-plan"],
    queryFn: () => base44.entities.Location.list("name", 100),
  });
  const { data: allPlatforms = [] } = useQuery({
    queryKey: ["platforms-for-plan"],
    queryFn: () => base44.entities.Platform.list("name", 100),
  });
  const { data: allTeams = [] } = useQuery({
    queryKey: ["all-teams-for-plan"],
    queryFn: () => base44.entities.Team.list("name", 500),
  });

  const platforms = (allPlatforms || []).filter(
    (p) => p.is_active !== false && (p.gender === "Boys and Girls" || p.gender === segment?.gender)
  );

  // A branch-scoped admin only sets up tryouts for their own branch.
  const branchOptions = branchScopeId ? (locations || []).filter((l) => l.id === branchScopeId) : locations || [];

  useEffect(() => {
    if (!segment) return;
    setTitle(`${currentSeason()} ${segment.ageGroup} ${segment.gender} Tryouts`);
    setSeason(currentSeason());
    setSelectedTeamIds(segment.teams.map((t) => t.id));
    setSelectedLocationIds(
      Array.from(new Set(segment.teams.map((t) => t.location_id).filter(Boolean)))
        .filter((id) => !branchScopeId || id === branchScopeId)
    );
    setSelectedPlatformIds([]);
    setSetup(EMPTY_SETUP);
    setLeadUserId("");
    const today = new Date();
    setStartDate(formatDate(today, "yyyy-MM-dd"));
    setEndDate(formatDate(addDays(today, 14), "yyyy-MM-dd"));
    setNotes("");
    setMainDate("");
    setMainStartTime("");
    setMainEndTime("");
    setMainLocation("");
    setExpectedAttendance("");
    setAutoRegistration(true);
    setError("");
  }, [segment]);

  // Show ALL teams — not just the segment's pre-filtered ones. Branch/platform
  // filters narrow the visible list, but the user can add any team by clearing
  // those filters. Segment teams are pre-selected as a convenience.
  const filteredTeams = (allTeams || []).filter((t) => {
    if (selectedLocationIds.length > 0 && !selectedLocationIds.includes(t.location_id)) return false;
    if (selectedPlatformIds.length > 0 && !selectedPlatformIds.includes(t.platform_id)) return false;
    return true;
  });

  if (!segment) return null;

  const leadOptions = staff
    .filter((s) => TRYOUT_LEAD_ROLES.includes(s.role))
    .map((s) => ({ value: s.user_id, label: s.user_name || s.user_email || "Unknown" }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const toggleLocation = (id) => {
    setSelectedLocationIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
  };

  const teamOptions = filteredTeams.map((t) => ({
    value: t.id,
    label: `${t.name}${t.coach_name ? ` — ${t.coach_name}` : ""}`,
  }));

  const handleCreate = async () => {
    if (!title || selectedTeamIds.length === 0) return;
    if (!mainDate) {
      setError("The Main Club Tryout Date is required — a plan can't be created without it.");
      return;
    }
    setError("");
    setSaving(true);

    const selectedTeams = filteredTeams.filter((t) => selectedTeamIds.includes(t.id));
    const selectedLocations = locations.filter((l) => selectedLocationIds.includes(l.id));
    const selectedPlatforms = platforms.filter((p) => selectedPlatformIds.includes(p.id));
    const lead = staff.find((s) => s.user_id === leadUserId);

    const plan = await base44.entities.TryoutPlan.create({
      title,
      age_group: segment.ageGroup,
      gender: segment.gender,
      format: segment.format,
      season,
      start_date: startDate,
      end_date: endDate,
      team_ids: selectedTeams.map((t) => t.id),
      team_names: selectedTeams.map((t) => t.name),
      location_ids: selectedLocations.map((l) => l.id),
      location_names: selectedLocations.map((l) => l.name),
      platform_ids: selectedPlatforms.map((p) => p.id),
      platform_names: selectedPlatforms.map((p) => p.name),
      lead_user_id: lead?.user_id || "",
      lead_name: lead?.user_name || "",
      notes,
      status: "draft",
      tryout_fee: setup.tryout_fee === "" ? undefined : Number(setup.tryout_fee),
      max_capacity: setup.max_capacity === "" ? undefined : Number(setup.max_capacity),
      registration_open_date: setup.registration_open_date,
      registration_close_date: setup.registration_close_date,
      required_documents: setup.required_documents.filter((d) => (d.name || "").trim()),
    });

    let registration_url = autoRegistration ? `${window.location.origin}/TryoutSignup?id=PENDING` : "";
    const event = await base44.entities.TryoutEvent.create({
      tryout_plan_id: plan.id,
      type: "main_tryout",
      is_anchor: true,
      date: mainDate,
      start_time: mainStartTime,
      end_time: mainEndTime,
      location: mainLocation || selectedLocations[0]?.name || "",
      owner_user_id: lead?.user_id || "",
      owner_name: lead?.user_name || "",
      expected_attendance: expectedAttendance ? Number(expectedAttendance) : undefined,
      auto_registration: autoRegistration,
      registration_url,
      stage: "planned",
    });

    if (autoRegistration) {
      await base44.entities.TryoutEvent.update(event.id, {
        registration_url: `${window.location.origin}/TryoutSignup?id=${event.id}`,
      });
    }

    const staffByRole = resolveStaffByRole(staff);
    await generateEventTasks({ event, plan, staffByRole });

    setSaving(false);
    onCreated();
    navigate(`/TryoutPlanDetail?id=${plan.id}`);
  };

  return (
    <Dialog open={!!segment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create Tryout Plan — {segment.ageGroup} {segment.gender} {segment.format}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Plan title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Season</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentSeason()}>Current ({currentSeason()})</SelectItem>
                  <SelectItem value={nextSeason()}>Next ({nextSeason()})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tryout Lead</Label>
              <SearchableSelect
                value={leadUserId}
                onChange={setLeadUserId}
                options={leadOptions}
                placeholder="Search lead…"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Plan start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Plan end date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Branches ({selectedLocationIds.length} selected)</Label>
            <div className="flex flex-wrap gap-2">
              {branchOptions.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => toggleLocation(loc.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] select-none ${
                    selectedLocationIds.includes(loc.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {loc.name}
                </button>
              ))}
              {branchOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">No branches set up yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Platforms</Label>
            <MultiSelectDropdown
              label="All platforms"
              options={platforms.map((p) => ({ value: p.id, label: p.name }))}
              selected={selectedPlatformIds}
              onChange={setSelectedPlatformIds}
              searchable
            />
          </div>

          <div className="space-y-1.5">
            <Label>Teams ({selectedTeamIds.length} selected)</Label>
            <MultiSelectDropdown
              label="Select teams"
              options={teamOptions}
              selected={selectedTeamIds}
              onChange={setSelectedTeamIds}
              searchable
            />
            {filteredTeams.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No teams match the selected branches/platforms. Adjust filters above.
              </p>
            )}
          </div>

          <PlanSetupFields value={setup} onChange={(patch) => setSetup((s) => ({ ...s, ...patch }))} />

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Main Club Tryout Date
            </p>
            <p className="text-xs text-muted-foreground">
              Every plan is anchored to one Main Club Tryout Date, created together with the plan.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={mainDate} onChange={(e) => setMainDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Input type="time" value={mainStartTime} onChange={(e) => setMainStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input type="time" value={mainEndTime} onChange={(e) => setMainEndTime(e.target.value)} />
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={mainLocation} onChange={(e) => setMainLocation(e.target.value)} placeholder="Field / facility name" />
              </div>
              <div className="space-y-1.5">
                <Label>Expected attendance</Label>
                <Input type="number" min="0" value={expectedAttendance} onChange={(e) => setExpectedAttendance(e.target.value)} placeholder="e.g. 60" />
              </div>
            </div>

            <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Auto-create registration page</p>
                <p className="text-xs text-muted-foreground">Generates a public signup link for this event</p>
              </div>
              <Switch checked={autoRegistration} onCheckedChange={setAutoRegistration} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes about this plan" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !title || selectedTeamIds.length === 0 || !mainDate}>
            {saving ? "Creating…" : "Create Plan & Main Tryout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}