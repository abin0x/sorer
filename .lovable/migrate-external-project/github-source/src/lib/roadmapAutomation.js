import { base44 } from "@/api/base44Client";

/**
 * Automatically marks active, not-yet-completed RoadmapTasks linked to a given
 * platform module as fulfilled. Call this from the action that "completes" that
 * workstream in real usage (e.g. approving a registration, accepting an offer).
 * Layers the static RACI roadmap into live platform activity.
 */
export async function autoCompleteRoadmapTasks(moduleKey) {
  try {
    const tasks = await base44.entities.RoadmapTask.filter(
      { linked_module: moduleKey, is_active: true },
      null,
      100
    );
    const pending = tasks.filter((t) => t.status !== "completed");
    if (pending.length === 0) return [];

    await base44.entities.RoadmapTask.bulkUpdate(
      pending.map((t) => ({
        id: t.id,
        status: "completed",
        completed_date: new Date().toISOString(),
        completed_by: "system",
        fulfillment_notes: (t.fulfillment_notes ? t.fulfillment_notes + " " : "") + "Auto-completed by platform activity.",
      }))
    );
    return pending;
  } catch (e) {
    // Non-critical — never block the primary action on roadmap bookkeeping
    return [];
  }
}