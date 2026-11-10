import { TRYOUT_FORMATS, TRYOUT_GENDERS } from "@/lib/tryoutDefaults";

export function buildColumns() {
  const columns = [];
  TRYOUT_FORMATS.forEach((format) => {
    TRYOUT_GENDERS.forEach((gender) => {
      columns.push({ format, gender, key: `${format}_${gender}`, label: `${format} ${gender}` });
    });
  });
  return columns;
}

export function cellKey(ageGroup, format, gender) {
  return `${ageGroup}::${format}::${gender}`;
}

/**
 * Builds the Age Group x (Format x Gender) matrix used by the Tryout Planner
 * admin screen. Each cell aggregates the teams in that segment plus the most
 * relevant (non-completed, else most recent) TryoutPlan for it.
 */
export function buildMatrix({ teams = [], ageGroups = [], plans = [] }) {
  const orderMap = {};
  ageGroups.forEach((ag) => {
    orderMap[ag.age_group] = ag.order ?? 999;
  });

  const rowSet = new Set();
  teams.forEach((t) => t.age_group && rowSet.add(t.age_group));
  ageGroups.forEach((ag) => ag.age_group && rowSet.add(ag.age_group));
  const rows = Array.from(rowSet).sort((a, b) => {
    const diff = (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  const columns = buildColumns();
  const cells = {};
  rows.forEach((ageGroup) => {
    columns.forEach((col) => {
      cells[cellKey(ageGroup, col.format, col.gender)] = { teams: [], plan: null };
    });
  });

  teams.forEach((team) => {
    if (!team.age_group || !team.playing_format) return;
    const genders = team.gender === "Boys and Girls" ? TRYOUT_GENDERS : [team.gender];
    genders.forEach((gender) => {
      const key = cellKey(team.age_group, team.playing_format, gender);
      if (cells[key]) cells[key].teams.push(team);
    });
  });

  // Prefer an active plan over a draft, and a draft over nothing; ignore completed
  // plans once a newer non-completed one exists for the same segment.
  const rank = { active: 2, draft: 1, completed: 0 };
  plans.forEach((plan) => {
    if (!plan.age_group || !plan.format || !plan.gender) return;
    const key = cellKey(plan.age_group, plan.format, plan.gender);
    const cell = cells[key];
    if (!cell) return;
    if (!cell.plan || (rank[plan.status] ?? 0) >= (rank[cell.plan.status] ?? 0)) {
      cell.plan = plan;
    }
  });

  return { rows, columns, cells };
}