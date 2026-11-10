import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { TRYOUT_LEAD_ROLES, TRYOUT_PLAN_STATUSES, currentSeason, nextSeason } from "@/lib/tryoutDefaults";
import SearchableSelect from "@/components/tryout/SearchableSelect";
import MultiSelectDropdown from "@/components/communication/MultiSelectDropdown";
import PlanSetupFields from "@/components/tryout/PlanSetupFields";
import InlineTeamDialog from "@/components/tryout/InlineTeamDialog";
import { toast } from "sonner";

/**
 * Edits a tryout event: its name, season, branches, teams it feeds, tryout
 * lead, registration window, fee, capacity, required documents and status.
 * Teams that don't exist yet can be created inline.
 */
export default function EditPlanDialog({ plan, staff, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [season, setSeason] = useState(currentSeason());
  const [leadUserId, setLeadUserId] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState([]);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [setup, setSetup] = useState({
    tryout_fee: "",
    registration_open_date: "",
    registration_close_date: "",
    max_capacity: "",
    required_documents: [],
  });
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: locations = [] } = useQuery({
    queryKey: ["locations-for-plan"],
    queryFn: () => base44.entities.Location.list("name", 100),
  });
  const { data: allPlatforms = [] } = useQuery({
    queryKey: ["platforms-for-plan"],
    queryFn: () => base44.entities.Platform.list("name", 100),
  });
  const { data: allTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["all-teams"],
    queryFn: () => base44.entities.Team.list("-created_date", 500),
  });

  const platforms = (allPlatforms || []).filter(
    (p) => p.is_active !== false && (p.gender === "Boys and Girls" || p.gender === plan?.gender)
  );

  useEffect(() => {
    if (!plan) return;
    setTitle(plan.title || "");
    setSeason(plan.season || currentSeason());
    setLeadUserId(plan.lead_user_id || "");
    setSelectedTeamIds(plan.team_ids || []);
    setSelectedLocationIds(plan.location_ids || []);
    setSelectedPlatformIds(plan.platform_ids?.length ? plan.platform_ids : plan.platform_id ? [plan.platform_id] : []);
    setStartDate(plan.start_date || "");
    setEndDate(plan.end_date || "");
    setNotes(plan.notes || "");
    setStatus(plan.status || "draft");
    setSetup({
      tryout_fee: plan.tryout_fee ?? "",
      registration_open_date: plan.registration_open_date || "",
      registration_close_date: plan.registration_close_date || "",
      max_capacity: plan.max_capacity ?? "",
      required_documents: plan.required_documents || [],
    });
  }, [plan]);

  // Show ALL teams — not just segment-matching ones. Branch/platform filters
  // narrow the visible list, but the user can add any team.
  const filteredTeams = (allTeams || []).filter((t) => {
    if (selectedLocationIds.length > 0 && !selectedLocationIds.includes(t.location_id)) return false;
    if (selectedPlatformIds.length > 0 && !selectedPlatformIds.includes(t.platform_id)) return false;
    return true;
  });

  if (!plan) return null;

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedTeams = filteredTeams.filter((t) => selectedTeamIds.includes(t.id));
      const selectedLocations = locations.filter((l) => selectedLocationIds.includes(l.id));
      const selectedPlatforms = platforms.filter((p) => selectedPlatformIds.includes(p.id));
      const lead = staff.find((s) => s.user_id === leadUserId);
      await base44.entities.TryoutPlan.update(plan.id, {
        title,
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
        status,
        tryout_fee: setup.tryout_fee === "" ? undefined : Number(setup.tryout_fee),
        max_capacity: setup.max_capacity === "" ? undefined : Number(setup.max_capacity),
        registration_open_date: setup.registration_open_date,
        registration_close_date: setup.registration_close_date,
        required_documents: setup.required_documents.filter((d) => (d.name || "").trim()),
      });
      toast.success("Plan updated");
      onSaved();
    } catch (e) {
      toast.error("Failed to update plan");
    }
    setSaving(false);
  };

  return (
    <>
      <Dialog open={!!plan} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tryout Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Event name</Label>
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
                <Label>Tryout window starts</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tryout window ends</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRYOUT_PLAN_STATUSES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Branches ({selectedLocationIds.length} selected)</Label>
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => (
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
              <div className="flex items-center justify-between gap-2">
                <Label>Teams ({selectedTeamIds.length} selected)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowTeamDialog(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> New team
                </Button>
              </div>
              <MultiSelectDropdown
                label="Select teams"
                options={teamOptions}
                selected={selectedTeamIds}
                onChange={setSelectedTeamIds}
                searchable
              />
              <p className="text-xs text-muted-foreground">
                The teams this tryout feeds. Create one here if it doesn't exist yet.
              </p>
            </div>

            <PlanSetupFields value={setup} onChange={(patch) => setSetup((s) => ({ ...s, ...patch }))} />

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !title}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InlineTeamDialog
        open={showTeamDialog}
        plan={plan}
        onClose={() => setShowTeamDialog(false)}
        onCreated={(team) => {
          setShowTeamDialog(false);
          setSelectedTeamIds((prev) => (prev.includes(team.id) ? prev : [...prev, team.id]));
          queryClient.invalidateQueries({ queryKey: ["all-teams"] });
        }}
      />
    </>
  );
}