import { base44 } from "@/api/base44Client";
import { addDays, format as formatDate, parseISO } from "date-fns";
import { TRYOUT_SUBTASK_TEMPLATE, PARENT_TASK_DUE_OFFSET_DAYS } from "@/lib/tryoutDefaults";

/** First active UserRoles record per club role, keyed by role. */
export function resolveStaffByRole(staff) {
  const map = {};
  staff.forEach((s) => {
    if (!map[s.role]) map[s.role] = s;
  });
  return map;
}

/**
 * Creates the parent TryoutTask + 5 default TryoutSubtasks for a newly
 * created TryoutEvent, with due dates offset from the event date and
 * assignees resolved from the club's staff directory.
 */
export async function generateEventTasks({ event, plan, staffByRole }) {
  const eventDate = parseISO(event.date);
  const leadStaff = staffByRole.tryout_lead;

  const eventLabels = { main_tryout: "Main Club Tryout", open_training: "Open Training", supplemental_tryout: `Supplemental Tryout${event.supplemental_index ? ` #${event.supplemental_index}` : ""}` };
  const task = await base44.entities.TryoutTask.create({
    tryout_event_id: event.id,
    title: `${eventLabels[event.type] || "Tryout"} – ${plan.age_group || plan.title} – ${event.date}`,
    due_date: formatDate(addDays(eventDate, -PARENT_TASK_DUE_OFFSET_DAYS), "yyyy-MM-dd"),
    assignee_id: plan.lead_user_id || leadStaff?.user_id || "",
    assignee_name: plan.lead_name || leadStaff?.user_name || "",
    status: "pending",
    progress: 0,
  });

  const subtasks = TRYOUT_SUBTASK_TEMPLATE.map((tpl) => {
    const owner = tpl.default_owner_role === "tryout_lead" && plan.lead_user_id
      ? { user_id: plan.lead_user_id, user_name: plan.lead_name }
      : staffByRole[tpl.default_owner_role];
    return {
      tryout_task_id: task.id,
      type: tpl.type,
      title: tpl.title,
      default_owner_role: tpl.default_owner_role,
      assignee_id: owner?.user_id || "",
      assignee_name: owner?.user_name || "",
      due_date: formatDate(addDays(eventDate, -tpl.due_offset_days), "yyyy-MM-dd"),
      status: "pending",
    };
  });

  await base44.entities.TryoutSubtask.bulkCreate(subtasks);
  return task;
}

/**
 * Recalculates a parent task's progress from its subtasks. When every
 * subtask is complete, marks the task complete and moves its event to the
 * "ready" Kanban stage (unless the event has already moved past it).
 */
export async function recalcTaskProgress(taskId) {
  const subtasks = await base44.entities.TryoutSubtask.filter({ tryout_task_id: taskId });
  const total = subtasks.length;
  const done = subtasks.filter((s) => s.status === "completed").length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  const task = await base44.entities.TryoutTask.update(taskId, {
    progress,
    status: allDone ? "completed" : done > 0 ? "in_progress" : "pending",
  });

  if (allDone && task.tryout_event_id) {
    const event = await base44.entities.TryoutEvent.get(task.tryout_event_id);
    if (event && ["planned", "in_progress"].includes(event.stage)) {
      await base44.entities.TryoutEvent.update(event.id, { stage: "ready" });
    }
  }

  return { progress, allDone };
}