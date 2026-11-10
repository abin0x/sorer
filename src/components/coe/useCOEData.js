import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const TABS = ["overview", "skill", "physical", "evaluations", "epic", "compare_players", "compare_teams"];
export const TAB_LABELS = { overview: "Overview", skill: "Skill Tests", physical: "Physical", evaluations: "Evaluations", epic: "EPIC", compare_players: "Compare Players", compare_teams: "Compare Teams" };

function ageFromDOB(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function getNested(obj, path) {
  if (!obj) return null;
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

export function useCOEData() {
  const [filters, setFilters] = useState({ teams: [], gender: "all", age: "all" });
  const [activeTab, setActiveTab] = useState("overview");

  const { data: players = [] } = useQuery({ queryKey: ["coe-players"], queryFn: () => base44.entities.Player.list("-created_date", 500) });
  const { data: teams = [] } = useQuery({ queryKey: ["coe-teams"], queryFn: () => base44.entities.Team.list("-created_date", 200) });
  const { data: scores = [] } = useQuery({ queryKey: ["coe-scores"], queryFn: () => base44.entities.SkillTestScore.list("-created_date", 3000) });
  const { data: physical = [] } = useQuery({ queryKey: ["coe-physical"], queryFn: () => base44.entities.PhysicalAssessment.list("-created_date", 3000) });
  const { data: evaluations = [] } = useQuery({ queryKey: ["coe-evals"], queryFn: () => base44.entities.PlayerEvaluation.list("-created_date", 3000) });
  const { data: skillTests = [] } = useQuery({ queryKey: ["coe-skill-tests"], queryFn: () => base44.entities.SkillTest.list("-created_date", 50) });

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);

  const filteredPlayers = useMemo(() => players.filter(p => {
    const team = teamMap.get(p.team_id);
    if (filters.teams.length > 0 && !filters.teams.includes(p.team_id)) return false;
    if (filters.gender !== "all" && team?.gender !== filters.gender) return false;
    if (filters.age !== "all" && team?.age_group !== filters.age) return false;
    return true;
  }), [players, teamMap, filters]);

  const filteredIds = useMemo(() => new Set(filteredPlayers.map(p => p.id)), [filteredPlayers]);

  const playerStats = useMemo(() => filteredPlayers.map(p => {
    const pScores = scores.filter(s => s.player_id === p.id);
    const pPhys = physical.filter(a => a.player_id === p.id).sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
    const pEvals = evaluations.filter(e => e.player_id === p.id).sort((a, b) => new Date(b.evaluation_date) - new Date(a.evaluation_date));
    const skillAvg = pScores.length ? Math.round(pScores.reduce((s, x) => s + x.score, 0) / pScores.length) : null;
    const skillByTest = {};
    pScores.forEach(s => { if (!skillByTest[s.test_id] || new Date(s.test_date) > new Date(skillByTest[s.test_id].test_date)) skillByTest[s.test_id] = s; });
    const physicalLatest = pPhys[0] || null;
    const physicalAvg = pPhys.length ? Math.round(pPhys.reduce((s, a) => s + (a.overall || 0), 0) / pPhys.length) : null;
    const evalLatest = pEvals[0] || null;
    const evalAvg = pEvals.length ? Math.round((pEvals.reduce((s, e) => s + (e.overall_score || 0), 0) / pEvals.length) * 10) / 10 : null;
    // EPIC tenets: Explosive=physical overall, Precise=skill avg, Insightful=eval tactical avg, Combative=eval mental avg
    const explosive = physicalLatest?.overall ?? null;
    const precise = skillAvg;
    const tacScores = evalLatest?.tactical_scores ? Object.values(evalLatest.tactical_scores).filter(v => v != null) : [];
    const menScores = evalLatest?.mental_scores ? Object.values(evalLatest.mental_scores).filter(v => v != null) : [];
    const insightful = tacScores.length ? Math.round((tacScores.reduce((a, b) => a + b, 0) / tacScores.length) * 10) : null;
    const combative = menScores.length ? Math.round((menScores.reduce((a, b) => a + b, 0) / menScores.length) * 10) : null;
    const epicTenets = [explosive, precise, insightful, combative].filter(v => v != null);
    const epicComposite = epicTenets.length ? Math.round(epicTenets.reduce((a, b) => a + b, 0) / epicTenets.length) : null;
    const team = teamMap.get(p.team_id);
    return { id: p.id, name: `${p.first_name} ${p.last_name}`, position: p.position, team: team?.name || "—", teamId: p.team_id, ageGroup: team?.age_group, platform: team?.platform_name, age: ageFromDOB(p.date_of_birth), skillAvg, skillByTest, physicalLatest, physicalAvg, evalLatest, evalAvg, explosive, precise, insightful, combative, epicComposite, hasSkill: pScores.length > 0, hasPhysical: pPhys.length > 0, hasEval: pEvals.length > 0 };
  }), [filteredPlayers, scores, physical, evaluations, teamMap]);

  const teamDashboards = useMemo(() => {
    const map = {};
    const playerTeamMap = {};
    filteredPlayers.forEach(p => {
      if (!p.team_id) return;
      playerTeamMap[p.id] = p.team_id;
      if (!map[p.team_id]) { const t = teamMap.get(p.team_id); map[p.team_id] = { id: p.team_id, name: t?.name || "—", ageGroup: t?.age_group, platform: t?.platform_name, players: 0, skill: 0, physical: 0, evals: 0 }; }
      map[p.team_id].players++;
    });
    new Set(scores.filter(s => filteredIds.has(s.player_id)).map(s => s.player_id)).forEach(pid => { const tid = playerTeamMap[pid]; if (map[tid]) map[tid].skill++; });
    new Set(physical.filter(a => filteredIds.has(a.player_id)).map(a => a.player_id)).forEach(pid => { const tid = playerTeamMap[pid]; if (map[tid]) map[tid].physical++; });
    new Set(evaluations.filter(e => filteredIds.has(e.player_id)).map(e => e.player_id)).forEach(pid => { const tid = playerTeamMap[pid]; if (map[tid]) map[tid].evals++; });
    return Object.values(map);
  }, [filteredPlayers, scores, physical, evaluations, teamMap, filteredIds]);

  const needsAttention = useMemo(() => {
    const missingPhysical = filteredPlayers.filter(p => !physical.some(a => a.player_id === p.id)).length;
    const missingSkill = filteredPlayers.filter(p => !scores.some(s => s.player_id === p.id)).length;
    const missingEval = filteredPlayers.filter(p => !evaluations.some(e => e.player_id === p.id)).length;
    return { missingPhysical, missingSkill, missingEval, recommendations: missingPhysical + missingSkill + missingEval };
  }, [filteredPlayers, physical, scores, evaluations]);

  const topPerformers = useMemo(() => [...playerStats].filter(p => p.epicComposite != null).sort((a, b) => b.epicComposite - a.epicComposite).slice(0, 5), [playerStats]);

  const tabMetrics = useMemo(() => {
    const N = filteredPlayers.length;
    const wS = playerStats.filter(p => p.skillAvg != null);
    const wP = playerStats.filter(p => p.physicalAvg != null);
    const wE = playerStats.filter(p => p.evalAvg != null);
    const wEp = playerStats.filter(p => p.epicComposite != null);
    const avg = (arr, key) => arr.length ? Math.round(arr.reduce((s, p) => s + p[key], 0) / arr.length) : null;
    const avgEval = wE.length ? Math.round((wE.reduce((s, p) => s + p.evalAvg, 0) / wE.length) * 10) / 10 : null;
    const totalSkill = scores.filter(s => filteredIds.has(s.player_id)).length;
    const totalPhys = physical.filter(a => filteredIds.has(a.player_id)).length;
    const totalEval = evaluations.filter(e => filteredIds.has(e.player_id)).length;
    const cov = (arr) => N ? Math.round((arr.length / N) * 100) : 0;

    if (activeTab === "overview") return [
      { label: "Players", value: N }, { label: "Avg Skill", value: avg(wS, "skillAvg") ?? "—" },
      { label: "Avg Physical", value: avg(wP, "physicalAvg") ?? "—" }, { label: "Avg EPIC", value: avg(wEp, "epicComposite") ?? "—" },
      { label: "Skill Tests", value: totalSkill }, { label: "Skill Coverage", value: `${cov(wS)}%` },
    ];
    if (activeTab === "skill") return [
      { label: "Players", value: N }, { label: "Avg Skill", value: avg(wS, "skillAvg") ?? "—" },
      { label: "Skill Tests", value: totalSkill }, { label: "Top Skill", value: wS.length ? Math.max(...wS.map(p => p.skillAvg)) : "—" },
      { label: "Missing Skill", value: needsAttention.missingSkill }, { label: "Skill Coverage", value: `${cov(wS)}%` },
    ];
    if (activeTab === "physical") return [
      { label: "Players", value: N }, { label: "Avg Physical", value: avg(wP, "physicalAvg") ?? "—" },
      { label: "Physicals", value: totalPhys }, { label: "Top Physical", value: wP.length ? Math.max(...wP.map(p => p.physicalAvg)) : "—" },
      { label: "Missing Physical", value: needsAttention.missingPhysical }, { label: "Physical Coverage", value: `${cov(wP)}%` },
    ];
    if (activeTab === "evaluations") return [
      { label: "Players", value: N }, { label: "Avg Evaluation", value: avgEval ?? "—" },
      { label: "Evaluations", value: totalEval }, { label: "Top Eval", value: wE.length ? Math.max(...wE.map(p => p.evalAvg)) : "—" },
      { label: "Missing Eval", value: needsAttention.missingEval }, { label: "Eval Coverage", value: `${cov(wE)}%` },
    ];
    return [
      { label: "Players", value: N }, { label: "Avg EPIC", value: avg(wEp, "epicComposite") ?? "—" },
      { label: "Top EPIC", value: wEp.length ? Math.max(...wEp.map(p => p.epicComposite)) : "—" }, { label: "EPIC Coverage", value: `${cov(wEp)}%` },
      { label: "Missing EPIC", value: N - wEp.length }, { label: "Teams", value: teamDashboards.length },
    ];
  }, [activeTab, filteredPlayers, playerStats, scores, physical, evaluations, filteredIds, needsAttention, teamDashboards]);

  const chartData = useMemo(() => {
    let averages = [], distribution = [], trends = [];
    const teamAvgs = {};
    playerStats.forEach(ps => {
      if (!ps.teamId) return;
      if (!teamAvgs[ps.teamId]) teamAvgs[ps.teamId] = { name: ps.team.replace(/^(GA |Aspire )/, "").substring(0, 12), skill: [], physical: [], eval: [] };
      if (ps.skillAvg != null) teamAvgs[ps.teamId].skill.push(ps.skillAvg);
      if (ps.physicalAvg != null) teamAvgs[ps.teamId].physical.push(ps.physicalAvg);
      if (ps.evalAvg != null) teamAvgs[ps.teamId].eval.push(ps.evalAvg * 10);
    });

    if (activeTab === "overview" || activeTab === "epic") {
      averages = Object.values(teamAvgs).map(t => ({ name: t.name, Skill: t.skill.length ? Math.round(t.skill.reduce((a, b) => a + b, 0) / t.skill.length) : 0, Physical: t.physical.length ? Math.round(t.physical.reduce((a, b) => a + b, 0) / t.physical.length) : 0, Evaluation: t.eval.length ? Math.round(t.eval.reduce((a, b) => a + b, 0) / t.eval.length) : 0 }));
      distribution = ["speed", "power", "agility", "endurance"].map(m => {
        const vals = playerStats.map(ps => ps.physicalLatest?.[m]).filter(Boolean);
        return { metric: m.charAt(0).toUpperCase() + m.slice(1), All: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
      });
      const byDate = {};
      evaluations.filter(e => filteredIds.has(e.player_id) && e.evaluation_date).forEach(e => { (byDate[e.evaluation_date] ||= []).push(e.overall_score); });
      trends = Object.entries(byDate).sort().map(([date, arr]) => ({ date, avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 }));
    } else if (activeTab === "skill") {
      averages = skillTests.map(t => {
        const ts = scores.filter(s => s.test_id === t.id && filteredIds.has(s.player_id));
        return { name: t.title.substring(0, 12), avg: ts.length ? Math.round(ts.reduce((s, x) => s + x.score, 0) / ts.length) : 0 };
      });
      distribution = skillTests.map(t => {
        const ts = scores.filter(s => s.test_id === t.id && filteredIds.has(s.player_id));
        return { metric: t.title.substring(0, 10), avg: ts.length ? Math.round(ts.reduce((s, x) => s + x.score, 0) / ts.length) : 0 };
      });
      const byDate = {};
      scores.filter(s => filteredIds.has(s.player_id) && s.test_date).forEach(s => { (byDate[s.test_date] ||= []).push(s.score); });
      trends = Object.entries(byDate).sort().map(([date, arr]) => ({ date, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }));
    } else if (activeTab === "physical") {
      averages = Object.values(teamAvgs).map(t => {
        const tPlayers = playerStats.filter(ps => ps.teamId && teamAvgs[ps.teamId] === t);
        const sp = tPlayers.map(p => p.physicalLatest?.speed).filter(Boolean);
        const pw = tPlayers.map(p => p.physicalLatest?.power).filter(Boolean);
        const ag = tPlayers.map(p => p.physicalLatest?.agility).filter(Boolean);
        const en = tPlayers.map(p => p.physicalLatest?.endurance).filter(Boolean);
        return { name: t.name, Speed: sp.length ? Math.round(sp.reduce((a, b) => a + b, 0) / sp.length) : 0, Power: pw.length ? Math.round(pw.reduce((a, b) => a + b, 0) / pw.length) : 0, Agility: ag.length ? Math.round(ag.reduce((a, b) => a + b, 0) / ag.length) : 0, Endurance: en.length ? Math.round(en.reduce((a, b) => a + b, 0) / en.length) : 0 };
      });
      distribution = ["speed", "power", "agility", "endurance"].map(m => {
        const vals = playerStats.map(ps => ps.physicalLatest?.[m]).filter(Boolean);
        return { metric: m.charAt(0).toUpperCase() + m.slice(1), All: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
      });
      const byDate = {};
      physical.filter(a => filteredIds.has(a.player_id) && a.assessment_date).forEach(a => { (byDate[a.assessment_date] ||= []).push(a.overall); });
      trends = Object.entries(byDate).sort().map(([date, arr]) => ({ date, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }));
    } else if (activeTab === "evaluations") {
      averages = Object.values(teamAvgs).map(t => ({ name: t.name, Evaluation: t.eval.length ? Math.round(t.eval.reduce((a, b) => a + b, 0) / t.eval.length) : 0 }));
      const techKeys = [["first_touch", "1st Touch"], ["passing", "Passing"], ["dribbling_1v1", "Dribbling"], ["receiving_under_pressure", "Receiving"], ["finishing", "Finishing"], ["heading", "Heading"]];
      distribution = techKeys.map(([k, label]) => {
        const vals = playerStats.map(ps => ps.evalLatest?.technical_scores?.[k]).filter(Boolean);
        return { metric: label, All: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0 };
      });
      const byDate = {};
      evaluations.filter(e => filteredIds.has(e.player_id) && e.evaluation_date).forEach(e => { (byDate[e.evaluation_date] ||= []).push(e.overall_score); });
      trends = Object.entries(byDate).sort().map(([date, arr]) => ({ date, avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 }));
    }
    return { averages, distribution, trends };
  }, [activeTab, playerStats, scores, physical, evaluations, skillTests, filteredIds]);

  const metricDetails = useMemo(() => {
    const allVals = {
      explosive: playerStats.map(p => p.explosive).filter(Boolean),
      precise: playerStats.map(p => p.precise).filter(Boolean),
      insightful: playerStats.map(p => p.insightful).filter(Boolean),
      combative: playerStats.map(p => p.combative).filter(Boolean),
    };
    if (activeTab === "overview" || activeTab === "epic") {
      return ["explosive", "precise", "insightful", "combative"].map(k => {
        const v = allVals[k];
        return { label: k.charAt(0).toUpperCase() + k.slice(1), best: v.length ? Math.max(...v) : null, average: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null };
      });
    }
    if (activeTab === "skill") {
      return skillTests.map(t => {
        const v = scores.filter(s => s.test_id === t.id && filteredIds.has(s.player_id)).map(s => s.score);
        return { label: t.title.substring(0, 12), best: v.length ? Math.max(...v) : null, average: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null };
      });
    }
    if (activeTab === "physical") {
      return [
        { key: "sprint_20m_seconds", label: "Sprint", lower: true },
        { key: "vertical_jump_inches", label: "Vertical" },
        { key: "agility_5_10_5_seconds", label: "Shuttle", lower: true },
        { key: "yoyo_level", label: "Endurance" },
      ].map(m => {
        const v = playerStats.map(ps => ps.physicalLatest?.[m.key]).filter(Boolean);
        return { label: m.label, best: v.length ? (m.lower ? Math.min(...v) : Math.max(...v)) : null, average: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null };
      });
    }
    if (activeTab === "evaluations") {
      const keys = [["overall_score", "Overall"], ["technical_scores.first_touch", "1st Touch"], ["technical_scores.passing", "Passing"], ["technical_scores.dribbling_1v1", "Dribbling"], ["technical_scores.receiving_under_pressure", "Receiving"], ["tactical_scores.attacking_organized", "Awareness"], ["technical_scores.crossing_service", "Weight"], ["mental_scores.mindset", "Start"]];
      return keys.map(([k, label]) => {
        const v = playerStats.map(ps => getNested(ps.evalLatest, k)).filter(Boolean);
        return { label, best: v.length ? Math.max(...v) : null, average: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null };
      });
    }
    return [];
  }, [activeTab, playerStats, scores, skillTests, filteredIds]);

  const tableData = useMemo(() => {
    let columns = [], rows = [];
    const baseRow = (ps) => ({ id: ps.id, name: ps.name, position: ps.position, team: ps.team, age: ps.age });
    if (activeTab === "overview") {
      columns = skillTests.map(t => t.title.substring(0, 10));
      rows = playerStats.map(ps => ({ ...baseRow(ps), values: skillTests.map(t => ps.skillByTest[t.id]?.score ?? null), highlight: ps.skillAvg }));
    } else if (activeTab === "epic") {
      columns = ["Skill", "Physical", "Eval", "EPIC"];
      rows = playerStats.map(ps => ({ ...baseRow(ps), values: [ps.skillAvg, ps.physicalAvg, ps.evalAvg, ps.epicComposite], highlight: ps.epicComposite }));
    } else if (activeTab === "skill") {
      columns = skillTests.map(t => t.title.substring(0, 10));
      rows = playerStats.map(ps => ({ ...baseRow(ps), values: skillTests.map(t => ps.skillByTest[t.id]?.score ?? null), highlight: ps.skillAvg }));
    } else if (activeTab === "physical") {
      columns = ["Sprint", "Vertical", "Shuttle", "Yo-Yo", "Speed", "Power", "Agility", "Endur.", "Overall"];
      rows = playerStats.map(ps => ({ ...baseRow(ps), values: ps.physicalLatest ? [ps.physicalLatest.sprint_20m_seconds, ps.physicalLatest.vertical_jump_inches, ps.physicalLatest.agility_5_10_5_seconds, ps.physicalLatest.yoyo_level, ps.physicalLatest.speed, ps.physicalLatest.power, ps.physicalLatest.agility, ps.physicalLatest.endurance, ps.physicalLatest.overall] : Array(9).fill(null), highlight: ps.physicalAvg }));
    } else if (activeTab === "evaluations") {
      columns = ["Overall", "1st Touch", "Passing", "Dribbling", "Receiving", "Finishing", "Heading", "Crossing", "Tackling"];
      const keys = ["overall_score", "technical_scores.first_touch", "technical_scores.passing", "technical_scores.dribbling_1v1", "technical_scores.receiving_under_pressure", "technical_scores.finishing", "technical_scores.heading", "technical_scores.crossing_service", "technical_scores.tackling_defending"];
      rows = playerStats.map(ps => ({ ...baseRow(ps), values: keys.map(k => getNested(ps.evalLatest, k)), highlight: ps.evalAvg }));
    }
    return { columns, rows, totalCount: playerStats.length };
  }, [activeTab, playerStats, skillTests]);

  return {
    filters, setFilters, activeTab, setActiveTab,
    filteredCount: filteredPlayers.length, teamCount: teamDashboards.length,
    tabMetrics, chartData, metricDetails, tableData,
    topPerformers, teamDashboards, needsAttention,
    teams, skillTests, teamMap, playerStats,
    scores, physical, evaluations, filteredPlayers,
  };
}