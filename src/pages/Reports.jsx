import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";
import { canAccessReports, getReportAccess } from "@/lib/reportsAccess";
import { useReportsData } from "@/hooks/useReportsData";
import { useSelectedSeason } from "@/lib/useSelectedSeason";
import ReportsFilterBar from "@/components/reports/ReportsFilterBar";
import ReportsOverview from "@/components/reports/ReportsOverview";
import ReportLibraryTab from "@/components/reports/ReportLibraryTab";
import ReportViewer from "@/components/reports/ReportViewer";
import ReportWizard from "@/components/reports/ReportWizard";
import SavedReportsTab from "@/components/reports/SavedReportsTab";
import PinnedReportsBar from "@/components/reports/PinnedReportsBar";
import { useReportScope } from "@/hooks/useReportScope";
import { getReportById } from "@/lib/reports/reportLibrary";
import { useModuleAccess } from "@/lib/useModuleAccess";
import AsyncState from "@/components/shared/AsyncState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Lock, Wand2 } from "lucide-react";

export default function Reports() {
  const { user } = useAuth();
  const { effectiveClubId } = useTenant();
  const { seasons, selected: selectedSeason, setSelectedSeason } = useSelectedSeason();

  const access = useMemo(() => getReportAccess(user), [user]);

  // Redirect-equivalent: if the user has no access, show a locked screen.
  if (!canAccessReports(user)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-1">No Access</h2>
        <p className="text-sm text-muted-foreground max-w-sm">You don't have permission to view Reports & Analytics.</p>
      </div>
    );
  }

  return (
    <ReportsInner
      user={user}
      clubId={effectiveClubId}
      access={access}
      seasons={seasons}
      selectedSeason={selectedSeason}
      setSelectedSeason={setSelectedSeason}
    />
  );
}

function ReportsInner({ user, clubId, access, seasons, selectedSeason, setSelectedSeason }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [savedConfig, setSavedConfig] = useState(null);
  const [customBuilder, setCustomBuilder] = useState(null); // null = inactive, { config } = active
  const { hasModule } = useModuleAccess();
  const [filters, setFilters] = useState({
    seasonId: selectedSeason?.id || null,
    branchId: null,
    teamId: null,
    platformId: null,
    dateStart: null,
    dateEnd: null,
  });
  // The selected season loads after the first render; adopt it once it arrives.
  useEffect(() => {
    if (selectedSeason?.id) setFilters((f) => (f.seasonId ? f : { ...f, seasonId: selectedSeason.id }));
  }, [selectedSeason?.id]);
  const { effBranchIds, effTeamIds, scopeReady } = useReportScope(user, clubId, access, filters);
  const reportScope = { clubId, effBranchIds, effTeamIds, scopeReady };

  // Resolve the selected season name (for Player/Team season filtering).
  const seasonName = useMemo(() => {
    const s = seasons.find((x) => x.id === filters.seasonId);
    return s?.name || null;
  }, [seasons, filters.seasonId]);

  // Compute previous period for "change vs previous period" KPIs.
  const { dateStart, dateEnd, prevStart, prevEnd } = useMemo(() => {
    let start = filters.dateStart;
    let end = filters.dateEnd || null;
    // Default to season dates if no explicit range.
    if (!start && filters.seasonId) {
      const s = seasons.find((x) => x.id === filters.seasonId);
      start = s?.start_date || null;
      end = s?.end_date || null;
    }
    let pStart = null, pEnd = null;
    if (start) {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : new Date();
      const duration = endDate - startDate;
      pEnd = new Date(startDate.getTime() - 86400000).toISOString().split("T")[0];
      pStart = new Date(startDate.getTime() - duration - 86400000).toISOString().split("T")[0];
    }
    return { dateStart: start, dateEnd: end, prevStart: pStart, prevEnd: pEnd };
  }, [filters, seasons]);

  // Load filter options (branches, teams, platforms) scoped by role.
  const { data: branches = [] } = useQuery({
    queryKey: ["reports-branches", clubId],
    queryFn: () => base44.entities.Location.filter({ club_id: clubId, is_active: true }),
    enabled: !!clubId,
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ["reports-teams", clubId],
    queryFn: () => base44.entities.Team.filter({ club_id: clubId }, { sort: "name", limit: 200 }).then((res) => res.items),
    enabled: !!clubId,
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["reports-platforms", clubId],
    queryFn: () => base44.entities.Platform.filter({ club_id: clubId, is_active: true }),
    enabled: !!clubId,
  });

  // Narrow branch options for branch-scoped roles.
  const visibleBranches = useMemo(() => {
    if (!access.isBranchScoped) return branches;
    return branches.filter((b) => b.branch_director_email === user.email || b.branch_admin_email === user.email);
  }, [branches, access, user]);

  // Narrow team options for team-scoped roles (coach).
  const visibleTeams = useMemo(() => {
    if (!access.isTeamScoped) return allTeams;
    // Coach sees teams where they're assigned — resolved in the data hook, but for the dropdown
    // we show teams matching their coach email via the denormalized coach_name field.
    return allTeams; // The data hook enforces the actual filter; dropdown shows all for simplicity.
  }, [allTeams, access]);

  const dataFilters = {
    seasonId: filters.seasonId,
    seasonName,
    branchId: filters.branchId,
    teamId: filters.teamId,
    platformId: filters.platformId,
    dateStart,
    dateEnd,
    prevStart,
    prevEnd,
  };

  const globalSummary = [
    seasonName && `Season: ${seasonName}`,
    filters.branchId && `Branch: ${branches.find((b) => b.id === filters.branchId)?.name || "selected"}`,
    filters.teamId && `Team: ${allTeams.find((t) => t.id === filters.teamId)?.name || "selected"}`,
    filters.platformId && `League: ${platforms.find((p) => p.id === filters.platformId)?.name || "selected"}`,
    (dateStart || dateEnd) && `Dates: ${dateStart || "…"} → ${dateEnd || "today"}`,
  ].filter(Boolean);

  const { kpis, charts, isLoading, needsClub, seasonFallback } = useReportsData({ user, clubId, access, filters: dataFilters });

  // Pinned saved reports for the Overview bar
  const { data: savedReportsData } = useQuery({
    queryKey: ["saved-reports", clubId],
    queryFn: () => base44.entities.SavedReport.filter({ club_id: clubId, pinned: true }, { sort: "-created_date", limit: 20 }),
    enabled: !!clubId,
  });
  const pinnedReports = (savedReportsData?.items || savedReportsData || []).filter((sr) => {
    if (sr.visibility === "private") return sr.owner_id === user.id || user.role === "admin";
    if (sr.visibility === "role") {
      const role = user.custom_role || user.role;
      return role === sr.shared_role || user.role === "admin";
    }
    return true;
  });

  const handleKpiClick = (category) => {
    setSavedConfig(null);
    setActiveTab("reports");
    const reportMap = {
      finance: "payments_received",
      registration: "registrations_breakdown",
      roster: "team_rosters",
      tryouts: "tryout_funnel",
    };
    setSelectedReportId(reportMap[category] || null);
  };

  const handleSelectReport = (id) => {
    setSavedConfig(null);
    setSelectedReportId(id);
    setCustomBuilder(null);
  };

  const handleOpenSavedReport = (sr) => {
    // Custom reports open in the builder, not the viewer
    if (sr.report_id?.startsWith("custom:")) {
      setSelectedReportId(null);
      setSavedConfig(null);
      setCustomBuilder({ config: sr.config || null });
      setActiveTab("reports");
      return;
    }
    setCustomBuilder(null);
    setSavedConfig(sr.config || null);
    setSelectedReportId(sr.report_id);
    setActiveTab("reports");
  };

  const handleOpenCustomBuilder = () => {
    setSelectedReportId(null);
    setSavedConfig(null);
    setCustomBuilder({ config: null });
    setActiveTab("reports");
  };

  const handleBackFromBuilder = () => {
    setCustomBuilder(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Reports & Insights</h1>
          <p className="text-sm text-muted-foreground">Club-wide insights across players, registrations, finances, and tryouts.</p>
        </div>
      </div>

      {/* Global filter bar */}
      <ReportsFilterBar
        seasons={seasons}
        branches={visibleBranches}
        teams={visibleTeams}
        platforms={platforms}
        filters={filters}
        onChange={setFilters}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Report Center</TabsTrigger>
          <TabsTrigger value="saved">Saved & Scheduled</TabsTrigger>
          <button type="button" onClick={handleOpenCustomBuilder} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <Wand2 className="w-3.5 h-3.5" /> New report
          </button>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="space-y-6">
            <PinnedReportsBar pinnedReports={pinnedReports} onOpen={handleOpenSavedReport} />
            {isLoading ? (
              <AsyncState isLoading loadingLabel="Crunching numbers…" />
            ) : needsClub ? (
                <div className="rounded-lg border bg-muted/40 p-6 text-center text-sm text-muted-foreground">Choose a club first to see its numbers.</div>
            ) : (
                <>
                  {seasonFallback && (
                    <p className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">No players are tagged with {seasonName}, so these numbers cover all seasons.</p>
                  )}
                  <ReportsOverview kpis={kpis} charts={charts} onKpiClick={handleKpiClick} />
                </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          {customBuilder ? (
            <ReportWizard
              key={JSON.stringify(customBuilder.config || {})}
              onBack={handleBackFromBuilder}
              initialConfig={customBuilder.config}
              globalFilters={dataFilters}
              globalSummary={globalSummary}
              scope={reportScope}
              access={access}
            />
          ) : selectedReportId ? (
            <ReportViewer
              report={getReportById(selectedReportId)}
              onBack={() => { setSelectedReportId(null); setSavedConfig(null); }}
              globalFilters={dataFilters}
              scope={reportScope}
              access={access}
              initialConfig={savedConfig}
            />
          ) : (
            <ReportLibraryTab access={access} onSelectReport={handleSelectReport} hasModule={hasModule} onOpenCustomBuilder={handleOpenCustomBuilder} />
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <SavedReportsTab onOpenSavedReport={handleOpenSavedReport} />
        </TabsContent>
      </Tabs>
    </div>
  );
}