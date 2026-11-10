import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { generateSchedule } from "../../shared/trainingScheduler.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Only club_admin or facilities_manager can run
    const allowedRoles = ["club_admin", "club_director", "facility_manager"];
    const isPlatformAdmin = user.role === "admin";
    if (!isPlatformAdmin && !allowedRoles.includes(user.custom_role)) {
      return Response.json({ error: "Only club admins or facility managers can run the scheduler" }, { status: 403 });
    }

    const body = await req.json();
    const { club_id, scenario_id, config, scenario_name, season } = body;
    if (!club_id) return Response.json({ error: "club_id is required" }, { status: 400 });

    // Load all data in parallel (batched)
    const [teamsPage, fieldsPage, facilitiesPage, coachesPage, platformsPage] = await Promise.all([
      base44.entities.Team.filter({ club_id }, { limit: 500, fields: ["id", "name", "playing_format", "gender", "age_group", "platform_id", "platform_name", "coach_id", "coach_ids", "status"] }),
      base44.entities.Field.filter({ club_id }, { limit: 500, fields: ["id", "name", "facility_id", "facility_name", "format", "format_supported", "lighted", "indoor_outdoor", "daily_hours", "available_days", "status", "max_sections"] }),
      base44.entities.Facility.filter({ club_id }, { limit: 200, fields: ["id", "name", "daily_hours", "available_days"] }),
      base44.entities.Coach.filter({ club_id }, { limit: 500, fields: ["id", "first_name", "last_name", "email", "location_id"] }),
      base44.entities.Platform.filter({ club_id }, { limit: 200, fields: ["id", "name", "gender", "eligible_age_groups"] }),
    ]);

    const teams = teamsPage.items || teamsPage;
    const fields = fieldsPage.items || fieldsPage;
    const facilities = facilitiesPage.items || facilitiesPage;
    const coaches = coachesPage.items || coachesPage;
    const platforms = platformsPage.items || platformsPage;

    // Run the algorithm
    const mergedConfig = config || {};
    const lockedSessions = (mergedConfig.locked_sessions || []).map((s) => ({ ...s, locked: true }));
    const result = generateSchedule(teams, fields, facilities, coaches, platforms, { ...mergedConfig, locked_sessions: lockedSessions });

    // Create or update the scenario
    const runEntry = {
      timestamp: new Date().toISOString(),
      user_name: user.full_name || user.email,
      action: "generate",
      status: "completed",
      detail: `${result.scorecard.placed_count}/${result.scorecard.total_sessions} sessions placed`,
    };

    let scenario;
    if (scenario_id) {
      // Update existing
      const existing = await base44.entities.ScheduleScenario.get(scenario_id);
      scenario = await base44.entities.ScheduleScenario.update(scenario_id, {
        status: "ready",
        config: mergedConfig,
        sessions: result.sessions,
        scorecard: result.scorecard,
        unscheduled: result.unscheduled,
        run_log: [...(existing.run_log || []), runEntry],
      });
    } else {
      // Create new
      scenario = await base44.entities.ScheduleScenario.create({
        club_id,
        name: scenario_name || `Scenario ${new Date().toLocaleDateString()}`,
        status: "ready",
        season: season || "",
        config: mergedConfig,
        sessions: result.sessions,
        scorecard: result.scorecard,
        unscheduled: result.unscheduled,
        created_by: user.id,
        created_by_name: user.full_name || user.email,
        run_log: [runEntry],
      });
    }

    return Response.json({ scenario, scorecard: result.scorecard });
  } catch (error) {
    console.error("generate-training-schedule error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}