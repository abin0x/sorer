import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { expandToBookings } from "../../shared/trainingScheduler.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["club_admin", "club_director", "facility_manager"];
    const isPlatformAdmin = user.role === "admin";
    if (!isPlatformAdmin && !allowedRoles.includes(user.custom_role)) {
      return Response.json({ error: "Only club admins or facility managers can publish" }, { status: 403 });
    }

    const body = await req.json();
    const { scenario_id, notify } = body;
    if (!scenario_id) return Response.json({ error: "scenario_id is required" }, { status: 400 });

    const scenario = await base44.entities.ScheduleScenario.get(scenario_id);
    if (!scenario) return Response.json({ error: "Scenario not found" }, { status: 404 });
    if (scenario.status === "published") return Response.json({ error: "Scenario already published" }, { status: 400 });

    const config = scenario.config || {};
    const seasonStart = config.season_start || new Date().toLocaleDateString("en-CA");
    const weeks = config.weeks || 12;

    // Expand weekly template into per-week bookings
    const bookings = expandToBookings(scenario.sessions || [], seasonStart, weeks);

    // Bulk create bookings (batch of 500)
    let created = 0;
    for (let i = 0; i < bookings.length; i += 500) {
      const batch = bookings.slice(i, i + 500).map((b) => ({
        ...b,
        club_id: scenario.club_id,
        source_ref: `scenario:${scenario_id}`,
      }));
      const res = await base44.entities.Booking.bulkCreate(batch);
      created += res.created || batch.length;
    }

    // Log the publish
    const runEntry = {
      timestamp: new Date().toISOString(),
      user_name: user.full_name || user.email,
      action: "publish",
      status: "completed",
      detail: `${created} bookings created for ${weeks} weeks`,
    };

    await base44.entities.ScheduleScenario.update(scenario_id, {
      status: "published",
      published_at: new Date().toISOString(),
      published_by: user.id,
      published_by_name: user.full_name || user.email,
      run_log: [...(scenario.run_log || []), runEntry],
    });

    // Send notifications if requested
    if (notify && created > 0) {
      try {
        const coaches = scenario.sessions
          .flatMap((s) => s.coach_names || [])
          .filter((v, i, a) => a.indexOf(v) === i);
        // Notify club admins about the published schedule
        const adminMsg = `Training schedule published: ${created} bookings across ${weeks} weeks for "${scenario.name}".`;
        // Use SendEmail integration for notification
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `Training Schedule Published: ${scenario.name}`,
          body: adminMsg,
        });
      } catch (e) {
        console.error("Notification error:", e);
      }
    }

    return Response.json({ published: true, bookings_created: created, weeks });
  } catch (error) {
    console.error("publish-training-schedule error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}