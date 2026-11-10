import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, Check } from "lucide-react";
import { buildDefaultConfig } from "@/lib/trainingSchedulerConfig";
import StepReadiness from "@/components/training-scheduler/StepReadiness";
import StepPriority from "@/components/training-scheduler/StepPriority";
import StepRules from "@/components/training-scheduler/StepRules";
import StepGenerate from "@/components/training-scheduler/StepGenerate";
import StepReview from "@/components/training-scheduler/StepReview";
import StepEditLock from "@/components/training-scheduler/StepEditLock";
import StepPublish from "@/components/training-scheduler/StepPublish";

const STEPS = [
  { label: "Readiness", component: StepReadiness },
  { label: "Priority", component: StepPriority },
  { label: "Rules", component: StepRules },
  { label: "Generate", component: StepGenerate },
  { label: "Review", component: StepReview },
  { label: "Edit & Lock", component: StepEditLock },
  { label: "Publish", component: StepPublish },
];

export default function TrainingScheduler() {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId;
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({});
  const [scenarios, setScenarios] = useState([]);
  const [activeScenario, setActiveScenario] = useState(null);

  const { data: teams = [] } = useQuery({
    queryKey: ["tsTeams", clubId],
    queryFn: async () => (await base44.entities.Team.filter({ club_id: clubId }, { limit: 500, fields: ["id", "name", "playing_format", "gender", "age_group", "platform_id", "platform_name", "coach_id", "coach_ids", "status"] })).items,
    enabled: !!clubId,
  });
  const { data: fields = [] } = useQuery({
    queryKey: ["tsFields", clubId],
    queryFn: async () => (await base44.entities.Field.filter({ club_id: clubId }, { limit: 500, fields: ["id", "name", "facility_id", "facility_name", "format", "format_supported", "lighted", "indoor_outdoor", "daily_hours", "available_days", "status", "max_sections"] })).items,
    enabled: !!clubId,
  });
  const { data: facilities = [] } = useQuery({
    queryKey: ["tsFacilities", clubId],
    queryFn: async () => (await base44.entities.Facility.filter({ club_id: clubId }, { limit: 200, fields: ["id", "name", "daily_hours", "available_days"] })).items,
    enabled: !!clubId,
  });
  const { data: coaches = [] } = useQuery({
    queryKey: ["tsCoaches", clubId],
    queryFn: async () => (await base44.entities.Coach.filter({ club_id: clubId }, { limit: 500, fields: ["id", "first_name", "last_name", "email", "location_id"] })).items,
    enabled: !!clubId,
  });
  const { data: platforms = [] } = useQuery({
    queryKey: ["tsPlatforms", clubId],
    queryFn: async () => (await base44.entities.Platform.filter({ club_id: clubId }, { limit: 200, fields: ["id", "name", "gender", "eligible_age_groups"] })).items,
    enabled: !!clubId,
  });
  const { data: scenarioRows = [] } = useQuery({
    queryKey: ["tsScenarios", clubId],
    queryFn: async () => (await base44.entities.ScheduleScenario.filter({ club_id: clubId }, { sort: "-created_date", limit: 50 })).items,
    enabled: !!clubId,
  });

  useEffect(() => {
    if (scenarioRows?.length) setScenarios(scenarioRows);
  }, [scenarioRows]);

  // Initialize default config once teams and platforms are loaded
  useEffect(() => {
    if (teams.length && platforms.length && !config.team_prefs) {
      setConfig(buildDefaultConfig(teams, platforms));
    }
  }, [teams, platforms]);

  const CurrentStep = STEPS[step].component;
  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
          <Wand2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Automated Training Scheduler</h1>
          <p className="text-sm text-muted-foreground">Generate, review, and publish a draft training schedule scenario.</p>
        </div>
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <button
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/60"}`}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs">{i + 1}</span>}
              {s.label}
            </button>
            {i < STEPS.length - 1 && <div className={`h-0.5 w-4 ${i < step ? "bg-primary" : "bg-border"}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Current step */}
      <CurrentStep
        teams={teams}
        fields={fields}
        facilities={facilities}
        coaches={coaches}
        platforms={platforms}
        clubId={clubId}
        config={config}
        setConfig={setConfig}
        scenarios={scenarios}
        setScenarios={setScenarios}
        activeScenario={activeScenario}
        setActiveScenario={setActiveScenario}
        onUpdateScenario={setActiveScenario}
        onPrev={goPrev}
        onNext={goNext}
        onComplete={() => setStep(0)}
      />
    </div>
  );
}