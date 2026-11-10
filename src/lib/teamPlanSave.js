// An edit retains its identity; a copy deliberately has no id.
export function saveTeamPlanRecord(entity, form, payload) {
  return form.id ? entity.update(form.id, payload) : entity.create(payload);
}