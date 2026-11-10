import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useCOEData } from "@/components/coe/useCOEData";
import COEHeader from "@/components/coe/COEHeader";
import COEMetricsRow from "@/components/coe/COEMetricsRow";
import COECharts from "@/components/coe/COECharts";
import COETopPerformers from "@/components/coe/COETopPerformers";
import COETeamDashboards from "@/components/coe/COETeamDashboards";
import COENeedsAttention from "@/components/coe/COENeedsAttention";
import COEMetricDetails from "@/components/coe/COEMetricDetails";
import COEDataTable from "@/components/coe/COEDataTable";
import RecalculateScoresButton from "@/components/coe/RecalculateScoresButton";
import COEComparePlayers from "@/components/coe/COEComparePlayers";
import COECompareTeams from "@/components/coe/COECompareTeams";

export default function CenterOfExcellence() {
  const data = useCOEData();
  const qc = useQueryClient();
  const { tabMetrics, chartData, metricDetails, tableData, topPerformers, teamDashboards, needsAttention, activeTab, skillTests, playerStats } = data;

  const tableTitle = activeTab === "overview" ? "Overview"
    : activeTab === "skill" ? "Skill Test Results"
    : activeTab === "physical" ? "Physical Assessments"
    : activeTab === "evaluations" ? "Coach Evaluations"
    : "EPIC Tests";

  const handleSaveScore = async (playerId, testId, score) => {
    const test = skillTests.find(t => t.id === testId);
    const player = playerStats.find(p => p.id === playerId);
    try {
      // Check if there's an existing latest score to update
      const existing = player?.skillByTest?.[testId];
      if (existing?.id) {
        await base44.entities.SkillTestScore.update(existing.id, { score });
      } else {
        await base44.entities.SkillTestScore.create({
          player_id: playerId,
          player_name: player?.name || "",
          test_id: testId,
          test_title: test?.title || "",
          score,
          test_date: new Date().toISOString().split("T")[0],
        });
      }
      toast.success("Score updated");
      qc.invalidateQueries({ queryKey: ["coe-scores"] });
      qc.invalidateQueries({ queryKey: ["player-skill-scores"] });
    } catch (e) {
      toast.error("Failed to save: " + e.message);
      throw e;
    }
  };

  const isCompareTab = activeTab === "compare_players" || activeTab === "compare_teams";

  return (
    <div className="min-h-screen bg-[#f9fafa]">
      <COEHeader data={data} />

      <div className="px-4 lg:px-6 max-w-[1400px] mx-auto pt-3">
        <RecalculateScoresButton />
      </div>

      {isCompareTab ? (
        <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
          {activeTab === "compare_players" ? (
            <COEComparePlayers playerStats={playerStats} skillTests={skillTests} />
          ) : (
            <COECompareTeams teamDashboards={teamDashboards} playerStats={playerStats} />
          )}
        </div>
      ) : (
        <div className="p-4 lg:p-6 max-w-[1400px] mx-auto space-y-3">
          {/* Key Metrics */}
          <COEMetricsRow metrics={tabMetrics} />

          {/* Charts */}
          <COECharts chartData={chartData} activeTab={activeTab} />

          {/* Top Performers + Team Dashboards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <COETopPerformers performers={topPerformers} />
            <div className="lg:col-span-2">
              <COETeamDashboards teams={teamDashboards} />
            </div>
          </div>

          {/* Needs Attention */}
          <COENeedsAttention needs={needsAttention} />

          {/* Metric Details */}
          <COEMetricDetails details={metricDetails} />

          {/* Data Table — inline editable for skill tab */}
          <COEDataTable
            tableData={tableData}
            title={tableTitle}
            editable={activeTab === "skill" || activeTab === "overview"}
            skillTests={skillTests}
            onSaveScore={activeTab === "skill" || activeTab === "overview" ? handleSaveScore : undefined}
          />
        </div>
      )}
    </div>
  );
}